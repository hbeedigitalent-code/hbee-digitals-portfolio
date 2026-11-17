// src/app/api/admin/projects/[project_id]/deliverables/route.ts
//
// GET  — the project's deliverables, drafts included (Admin sees everything).
// POST — create one. { title, description?, version?, status?, due_date?, fileId? | externalUrl? }.
//
// FILES. A deliverable's file is chosen from the project's CLIENT's existing project_files rows (fileId), and the
// row's stored path becomes project_deliverables.file_url — so the Portal's signed-URL route serves it exactly
// as before and a permanent Storage URL is never produced. The fileId must belong to this project's client and
// its stored path must resolve inside the project-files bucket under that client; otherwise nothing is saved.
// An externalUrl is accepted only as a plain https link.
//
// A deliverable created already 'ready' / 'delivered' / 'revised' is client-visible and notifies the client
// once (keyed on its activity event); a 'draft' is invisible to the Portal and notifies nobody.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'
import { loadAdminProject, checkViolation } from '@/lib/projects/project-guard'
import { parseDeliverable, CLIENT_VISIBLE_DELIVERABLE_STATUSES } from '@/lib/projects/operations-validation'
import { resolveDeliverableFile } from '@/lib/projects/deliverable-file'
import { recordActivity } from '@/lib/activity/activity'
import { createNotification } from '@/lib/notifications/createNotification'

export const dynamic = 'force-dynamic'

const COLUMNS = 'id, title, description, version, status, due_date, uploaded_at, file_url'

function present(d: any) {
  const { file_url, ...rest } = d
  return { ...rest, hasFile: typeof file_url === 'string' && file_url.trim().length > 0 }
}

export async function GET(_request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const guard = await loadAdminProject(auth.db, params?.project_id)
  if (!guard.ok) return guard.response

  const [deliverables, files] = await Promise.all([
    auth.db.from('project_deliverables').select(COLUMNS).eq('project_id', guard.project.id).order('uploaded_at', { ascending: false }).limit(200),
    guard.project.client_id
      ? auth.db.from('project_files').select('id, file_name').eq('client_id', guard.project.client_id).order('uploaded_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (deliverables.error) return queryFailure('deliverables read', deliverables.error)
  return NextResponse.json({
    // file_url is never returned: Admin sees only whether a file is attached.
    deliverables: (deliverables.data || []).map(present),
    attachableFiles: (files.data || []).map((f: any) => ({ id: f.id, name: f.file_name })),
  })
}

export async function POST(request: Request, { params }: { params: { project_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth
  const guard = await loadAdminProject(db, params?.project_id)
  if (!guard.ok) return guard.response

  const parsed = parseDeliverable(await request.json().catch(() => null), 'create')
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const file = await resolveDeliverableFile(db, guard.project.client_id, parsed.value)
    if (!file.ok) return NextResponse.json({ error: file.error }, { status: 400 })

    const status = parsed.value.status ?? 'ready'
    const { data, error } = await db
      .from('project_deliverables')
      .insert({
        project_id: guard.project.id,
        title: parsed.value.title,
        description: parsed.value.description ?? null,
        version: parsed.value.version ?? null,
        status,
        due_date: parsed.value.due_date ?? null,
        file_url: file.fileUrl,
      })
      .select(COLUMNS)
      .single()
    if (error) {
      if (checkViolation(error)) return NextResponse.json({ code: 'status_check_violation', error: 'That deliverable status is not accepted. Nothing was saved.' }, { status: 409 })
      return queryFailure('deliverable create', error)
    }

    if (CLIENT_VISIBLE_DELIVERABLE_STATUSES.includes(status)) {
      const eventId = await recordActivity(db, {
        clientId: guard.project.client_id,
        projectId: guard.project.id,
        actorUserId: userId,
        actorRole: 'admin',
        entityType: 'deliverable',
        entityId: data.id,
        action: 'deliverable_added',
        summary: `Deliverable available: ${String(data.title).slice(0, 100)}`,
        visibility: 'client',
        dedupeKey: `deliverable_visible:${data.id}`,
      })
      if (eventId && guard.project.client_id) {
        await createNotification({
          scope: 'client',
          recipientId: guard.project.client_id,
          type: 'deliverable_ready',
          title: 'A deliverable is ready',
          message: String(data.title).slice(0, 160),
          entityType: 'project_deliverable',
          entityId: data.id,
          link: '/client-portal/files',
        })
      }
    }
    return NextResponse.json({ deliverable: present(data) }, { status: 201 })
  } catch (error) {
    return queryFailure('deliverable create', error)
  }
}
