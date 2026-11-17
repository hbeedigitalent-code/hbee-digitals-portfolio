// src/app/api/admin/projects/[project_id]/deliverables/[deliverable_id]/route.ts
//
// PATCH  — edit a deliverable (same fields as create, all optional). Moving it from 'draft' to a client-visible
//          status publishes it: one activity event and one client notification, both idempotent on the
//          deliverable id so editing it again later does not notify again.
// DELETE — remove the row. The underlying project_files object is NOT deleted (a deliverable only references
//          it; the file may be shared or still wanted).
// Rows are addressed as (id = :deliverable AND project_id = :project): another project's deliverable is a 404.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { loadAdminProject, checkViolation } from '@/lib/projects/project-guard'
import { parseDeliverable, CLIENT_VISIBLE_DELIVERABLE_STATUSES } from '@/lib/projects/operations-validation'
import { resolveDeliverableFile } from '@/lib/projects/deliverable-file'
import { recordActivity } from '@/lib/activity/activity'
import { createNotification } from '@/lib/notifications/createNotification'

export const dynamic = 'force-dynamic'

type Ctx = { params: { project_id: string; deliverable_id: string } }
const COLUMNS = 'id, title, description, version, status, due_date, uploaded_at, file_url'

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response
  const did = typeof params?.deliverable_id === 'string' ? params.deliverable_id.trim() : ''
  if (!ADMIN_UUID_RE.test(did)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = parseDeliverable(await request.json().catch(() => null), 'update')
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const { data: existing, error: lookupError } = await db
      .from('project_deliverables')
      .select('id, title, status')
      .eq('id', did)
      .eq('project_id', guard.project.id)
      .maybeSingle()
    if (lookupError) return queryFailure('deliverable lookup', lookupError)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const file = await resolveDeliverableFile(db, guard.project.client_id, parsed.value)
    if (!file.ok) return NextResponse.json({ error: file.error }, { status: 400 })

    const { fileId: _f, externalUrl: _e, ...fields } = parsed.value
    const updates: Record<string, unknown> = { ...fields }
    if (file.fileUrl !== undefined) updates.file_url = file.fileUrl

    const { data, error } = await db
      .from('project_deliverables')
      .update(updates)
      .eq('id', did)
      .eq('project_id', guard.project.id)
      .select(COLUMNS)
      .maybeSingle()
    if (error) {
      if (checkViolation(error)) return NextResponse.json({ code: 'status_check_violation', error: 'That deliverable status is not accepted. Nothing was saved.' }, { status: 409 })
      return queryFailure('deliverable update', error)
    }
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const wasVisible = CLIENT_VISIBLE_DELIVERABLE_STATUSES.includes(String(existing.status || ''))
    const isVisible = CLIENT_VISIBLE_DELIVERABLE_STATUSES.includes(String(data.status || ''))
    if (isVisible && !wasVisible) {
      await recordActivity(db, {
        clientId: guard.project.client_id,
        projectId: guard.project.id,
        actorUserId: userId,
        actorRole: 'admin',
        entityType: 'deliverable',
        entityId: did,
        action: 'deliverable_added',
        summary: `Deliverable available: ${String(data.title).slice(0, 100)}`,
        visibility: 'client',
        dedupeKey: `deliverable_visible:${did}`,
      })
      if (guard.project.client_id) {
        await createNotification({
          scope: 'client',
          recipientId: guard.project.client_id,
          type: 'deliverable_ready',
          title: 'A deliverable is ready',
          message: String(data.title).slice(0, 160),
          entityType: 'project_deliverable',
          entityId: did,
          link: '/client-portal/files',
        })
      }
    }

    const { file_url, ...rest } = data
    return NextResponse.json({ deliverable: { ...rest, hasFile: typeof file_url === 'string' && file_url.trim().length > 0 } })
  } catch (error) {
    return queryFailure('deliverable update', error)
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response
  const did = typeof params?.deliverable_id === 'string' ? params.deliverable_id.trim() : ''
  if (!ADMIN_UUID_RE.test(did)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await db.from('project_deliverables').delete().eq('id', did).eq('project_id', guard.project.id).select('id')
  if (error) return queryFailure('deliverable delete', error)
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
