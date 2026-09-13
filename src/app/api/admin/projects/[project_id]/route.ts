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
// projects.status carries a CHECK constraint. This route pre-checks against the
// application's copy of that vocabulary (src/lib/projects/project-status.ts) so
// a typo gets an explanatory 4xx rather than a generic failure, but the
// constraint itself remains the authority: a 23514 is caught below and surfaced
// verbatim in meaning. Nothing here silently maps a chosen status onto a
// different legal one — that would record something the admin did not choose.
//
// WHAT THIS ENDPOINT MAY CHANGE, AND WHAT IT MAY NOT.
//
// Project Management controls exactly three fields: status, progress and
// expected_completion_date. start_date is chosen when the project is CREATED
// and is display-only afterwards, so it is refused here rather than ignored.
// client_id, project_id, project_name and title are likewise refused. Every
// field in the request is either applied or the request fails — the endpoint
// never reports success having quietly dropped something the caller sent, which
// is how an admin came to see "Project updated." for an update that did not
// include the change they had made.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
// A Route Handler may not export arbitrary constants — `next build` rejects it
// even though `tsc --noEmit` does not — so the vocabulary lives in lib/.
import { toCalendarDate, isOnOrAfter } from '@/lib/projects/project-date'
import {
  PERSISTABLE_PROJECT_STATUSES,
  isPersistableProjectStatus,
} from '@/lib/projects/project-status'

export const dynamic = 'force-dynamic'

// The only fields Project Management may write. Anything else in the body is an
// error, not something to skip over.
const MANAGEMENT_FIELDS = ['status', 'progress', 'expected_completion_date'] as const

// Refused with a reason of its own, because these are not typos — they are
// fields an earlier version of this route accepted, or that a caller might
// reasonably expect to be editable here.
const FIELD_REFUSALS: Record<string, string> = {
  start_date:
    'The start date is set when the project is created and is not editable from Project Management.',
  client_id: 'A project cannot be re-linked to another client from Project Management.',
  project_id: 'The project reference cannot be changed.',
  project_name: 'The project name cannot be changed from Project Management.',
  title: 'The project title cannot be changed from Project Management.',
  id: 'The project identifier cannot be changed.',
}

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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    // Refuse a field this endpoint does not own, rather than dropping it. A
    // request that mentions start_date has to fail, or the caller is told the
    // project was updated when the date they sent was never written.
    for (const key of Object.keys(body)) {
      if ((MANAGEMENT_FIELDS as readonly string[]).includes(key)) continue
      return NextResponse.json(
        {
          error:
            FIELD_REFUSALS[key] ??
            `"${key}" is not a field Project Management can change.`,
          code: key === 'start_date' ? 'start_date_not_editable' : 'field_not_editable',
          field: key,
          editableFields: MANAGEMENT_FIELDS,
        },
        { status: 400 },
      )
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
        return NextResponse.json(
          {
            error: 'That is not a status this application recognises.',
            code: 'status_unknown',
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

    // ---- EXPECTED COMPLETION DATE ---------------------------------------
    //
    // Only a field PRESENT in the request is touched. An omitted date is left
    // exactly as stored — changing only the status must never blank a timeline,
    // and changing only a date must never reset status or progress. An
    // explicitly empty string is a deliberate "clear it", which is different
    // from omitting it.
    //
    // start_date is NOT handled here: it belongs to project creation and is
    // refused above, so no management update can move it.
    if (body?.expected_completion_date !== undefined) {
      const parsed = toCalendarDate(body.expected_completion_date)
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: 'Expected completion date must be a real calendar date (YYYY-MM-DD).',
            code: 'invalid_date',
          },
          { status: 400 },
        )
      }
      updates.expected_completion_date = parsed.value
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

    // The range is checked against the RESULTING pair. start_date can only be
    // the stored one now, so a completion date is still refused if it lands
    // before the day the project actually started.
    const storedStart = toCalendarDate((existing as any).start_date)
    const resultingStart = storedStart.ok ? storedStart.value : null

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

    // updated_at is maintained BY THE APPLICATION on this table.
    //
    // There is no trigger for it in this repository, no insert path writes it
    // (so rows carry only the column default from creation), and every other
    // admin surface here — blog, portfolio, pricing, services, settings, 2FA,
    // proposals — sets `updated_at: new Date().toISOString()` in its own update
    // object. Project updates were the one write that did not, which is why a
    // project's updated_at still matched its creation timestamp after a
    // successful edit. This follows the convention the codebase already has
    // rather than inventing a new one.
    updates.updated_at = new Date().toISOString()

    // client_id is NOT in `updates` and is never accepted from the request, so
    // a project's client relationship cannot be changed or cleared by this
    // endpoint. Re-linking a project is a separate, deliberate action.
    const { data: updated, error: updateError } = await db
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select('id, project_id, project_name, title, status, progress, client_id, start_date, expected_completion_date, updated_at')
      .maybeSingle()

    if (updateError) {
      const code = (updateError as { code?: string }).code
      console.error(`[admin/projects] update failed (code=${code ?? 'n/a'})`)

      // 23514 = check_violation. The database is the authority on the status
      // vocabulary, so if it refuses a value this route allowed, the admin is
      // told plainly that nothing was saved — never a silent no-op, and never a
      // substitution of some other status that would have been accepted.
      if (code === '23514') {
        return NextResponse.json(
          {
            error:
              `The database rejected "${updates.status ?? ''}". projects.status does not ` +
              'currently permit that value, so nothing was saved.',
            code: 'status_check_violation',
            persistableStatuses: PERSISTABLE_PROJECT_STATUSES,
          },
          { status: 409 },
        )
      }

      // 42703 = undefined_column. Only reachable if projects.updated_at is not
      // present; named so it is not mistaken for a permissions problem.
      if (code === '42703') {
        return NextResponse.json(
          { error: 'The project could not be updated: an expected column is missing.' },
          { status: 500 },
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

    // The caller is told exactly which fields were written, and is handed the
    // stored row to render. "Project updated." is then a statement about the
    // database rather than about the form.
    return NextResponse.json({
      success: true,
      project: updated,
      updatedFields: Object.keys(updates).filter((field) => field !== 'updated_at'),
    })
  } catch (error) {
    return queryFailure('project update', error)
  }
}
