// src/app/api/admin/projects/[project_id]/route.ts
//
// PATCH — update a project's management status and progress.
//
// WHY THIS ROUTE EXISTS. Both admin project detail pages updated `projects`
// STRAIGHT FROM THE BROWSER under the projects_admin_all RLS policy, and threw
// the result away:
//
//     const { error } = await supabase.from('projects').update({...}).eq(...)
//     if (!error) { setProject({ ...project, status, progress }) }
//
// There is no `else`. Every failure — RLS refusal, CHECK violation, network
// error — was silently discarded, the button stopped spinning, and the page
// carried on showing the old value. That is the reported symptom exactly:
// "Update Project" appears to do nothing and the badge never changes.
//
// It also meant an admin could write project state with a session cookie alone,
// with no 2FA, because an RLS policy cannot see the application's 2FA cookie.
// This route applies the established gate instead:
//
//     session -> user-bound 2FA -> service-role client -> active admin row
//
// THE STATUS VOCABULARY IS VALIDATED HERE, AGAINST THE DATABASE'S OWN RULE.
// projects.status carries a CHECK constraint that permits only
// 'draft' | 'published' | 'Pending Review'. The admin UI offers eight
// operational statuses ('In Progress', 'Onboarding', ...) that the constraint
// REJECTS with 23514. Nothing here silently maps a chosen status onto a
// different legal one — that would record something the admin did not choose.
// An unsupported value is refused with a message naming the constraint, and
// widening the vocabulary is a reviewed migration, not a workaround.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
// A Route Handler may not export arbitrary constants — `next build` rejects it
// even though `tsc --noEmit` does not — so the vocabulary lives in lib/.
import { toCalendarDate, isOnOrAfter } from '@/lib/projects/project-date'
import {
  PERSISTABLE_PROJECT_STATUSES,
  isPersistableProjectStatus,
  isOperationalProjectStatus,
} from '@/lib/projects/project-status'

export const dynamic = 'force-dynamic'

/**
 * The project, WITH its client, read under the service role.
 *
 * WHY THE READ MOVED OFF THE BROWSER. Both detail pages used to fetch this
 * with the session Supabase client:
 *
 *     supabase.from('projects').select('*, clients (full_name, business_name, email)')
 *
 * The `projects` half of that works, because projects_admin_all is still in
 * place — which is why the page renders the name, reference, status, progress
 * and dates perfectly well. The `clients` half does NOT. The lockdown migration
 * left `clients` with an OWN-ROW SELECT policy only, and deliberately no admin
 * policy, because an RLS policy cannot see the application's admin 2FA cookie.
 *
 * PostgREST applies RLS to embedded resources too, and a to-one embed the
 * caller may not read comes back as `null` rather than an error. So an admin
 * viewing someone else's project got a perfectly successful response in which
 * the client was silently absent — and the page rendered "N/A". No error, no
 * warning, nothing to notice.
 *
 * Reading it here instead is the same route every other admin surface already
 * takes: /admin/client-portal/[client_id] fetches /api/admin/clients/[id] for
 * exactly this reason.
 *
 * The embed is ALIASED to `client` so the runtime shape is stated by this
 * route rather than inferred from PostgREST's default relation naming, which
 * is what the previous property-name confusion turned on.
 */
export async function GET(
  _request: Request,
  { params }: { params: { project_id: string } },
) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth

  const projectId = typeof params?.project_id === 'string' ? params.project_id.trim() : ''
  if (!ADMIN_UUID_RE.test(projectId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { data: project, error } = await db
      .from('projects')
      .select('*, client:clients(id, full_name, business_name, email)')
      .eq('id', projectId)
      .maybeSingle()

    if (error) return queryFailure('project read', error)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ project })
  } catch (error) {
    return queryFailure('project read', error)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { project_id: string } },
) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth

  // The route parameter is the projects.id UUID, which is what both detail
  // pages already use for their lookup. projects.project_id (PROJ-957159) is a
  // DIFFERENT, human-readable column and is never used as a filter here.
  const projectId = typeof params?.project_id === 'string' ? params.project_id.trim() : ''
  if (!ADMIN_UUID_RE.test(projectId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    if (body?.status !== undefined) {
      const status = typeof body.status === 'string' ? body.status.trim() : ''

      if (!status) {
        return NextResponse.json({ error: 'A status is required.' }, { status: 400 })
      }

      if (!isPersistableProjectStatus(status)) {
        // Named explicitly rather than mapped. The admin sees why it cannot be
        // saved instead of watching the button do nothing.
        const known = isOperationalProjectStatus(status)
        return NextResponse.json(
          {
            error: known
              ? `"${status}" cannot be saved yet: the projects.status CHECK constraint currently ` +
                `permits only ${PERSISTABLE_PROJECT_STATUSES.join(', ')}. Widening it is a ` +
                `reviewed migration — nothing was changed.`
              : 'That is not a status this application recognises.',
            code: known ? 'status_not_persistable' : 'status_unknown',
            persistableStatuses: PERSISTABLE_PROJECT_STATUSES,
          },
          { status: 409 },
        )
      }

      updates.status = status
    }

    if (body?.progress !== undefined) {
      const progress = Number(body.progress)
      if (!Number.isFinite(progress) || !Number.isInteger(progress)) {
        return NextResponse.json({ error: 'Progress must be a whole number.' }, { status: 400 })
      }
      if (progress < 0 || progress > 100) {
        return NextResponse.json(
          { error: 'Progress must be between 0 and 100.' },
          { status: 400 },
        )
      }
      updates.progress = progress
    }

    // ---- CALENDAR DATES -------------------------------------------------
    //
    // Only a field PRESENT in the request is touched. An omitted date is left
    // exactly as stored — changing only the status must never blank a timeline,
    // and changing only a date must never reset status or progress. An
    // explicitly empty string is a deliberate "clear it", which is different
    // from omitting it.
    for (const field of ['start_date', 'expected_completion_date'] as const) {
      if (body?.[field] === undefined) continue

      const parsed = toCalendarDate(body[field])
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error:
              field === 'start_date'
                ? 'Start date must be a real calendar date (YYYY-MM-DD).'
                : 'Expected completion date must be a real calendar date (YYYY-MM-DD).',
            code: 'invalid_date',
          },
          { status: 400 },
        )
      }
      updates[field] = parsed.value
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    // The project must exist before it is written, so a missing row is a clean
    // 404 rather than a silent zero-row update.
    const { data: existing, error: lookupError } = await db
      .from('projects')
      .select('id, project_id, client_id, status, progress, start_date, expected_completion_date')
      .eq('id', projectId)
      .maybeSingle()

    if (lookupError) return queryFailure('project lookup', lookupError)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // The range is checked against the RESULTING pair — the value being written
    // if one is present, otherwise the value already stored. Sending only a
    // completion date must still be refused if it lands before the stored start.
    const resultingStart =
      'start_date' in updates
        ? (updates.start_date as string | null)
        : toCalendarDate((existing as any).start_date).ok
          ? (toCalendarDate((existing as any).start_date) as { value: string | null }).value
          : null

    const resultingEnd =
      'expected_completion_date' in updates
        ? (updates.expected_completion_date as string | null)
        : toCalendarDate((existing as any).expected_completion_date).ok
          ? (toCalendarDate((existing as any).expected_completion_date) as { value: string | null }).value
          : null

    if (resultingStart && resultingEnd && !isOnOrAfter(resultingEnd, resultingStart)) {
      return NextResponse.json(
        {
          error: `The expected completion date (${resultingEnd}) cannot be before the start date (${resultingStart}).`,
          code: 'date_range_invalid',
        },
        { status: 400 },
      )
    }

    // client_id is NOT in `updates` and is never accepted from the request, so
    // a project's client relationship cannot be changed or cleared by this
    // endpoint. Re-linking a project is a separate, deliberate action.
    const { data: updated, error: updateError } = await db
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select('id, project_id, project_name, title, status, progress, client_id, start_date, expected_completion_date')
      .maybeSingle()

    if (updateError) {
      const code = (updateError as { code?: string }).code
      console.error(`[admin/projects] update failed (code=${code ?? 'n/a'})`)

      // 23514 = check_violation. Surfaced as an actionable admin message rather
      // than a generic 500, because this is the constraint above.
      if (code === '23514') {
        return NextResponse.json(
          {
            error:
              'The database rejected that status. projects.status permits only ' +
              `${PERSISTABLE_PROJECT_STATUSES.join(', ')}.`,
            code: 'status_check_violation',
          },
          { status: 409 },
        )
      }
      return queryFailure('project update', updateError)
    }

    if (!updated) {
      // The row vanished between the lookup and the write, or a policy filtered
      // it. Either way nothing was saved and the caller is told so.
      return NextResponse.json(
        { error: 'The project could not be updated.' },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, project: updated })
  } catch (error) {
    return queryFailure('project update', error)
  }
}
