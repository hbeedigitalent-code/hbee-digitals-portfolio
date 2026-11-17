// src/app/api/admin/requests/[id]/route.ts
//
// GET   — one request with its full thread (public replies AND internal notes), activity history, client and
//         project summaries. Gate: requireActiveAdmin.
// PATCH — associate the request with a project. { project_id: <uuid> | null }. The project must belong to the
//         SAME client as the request; anything else is refused, so a request can never be pointed at another
//         client's project (the portal's ownership checks rely on that).
//
// Authors are reduced to 'client' | 'hbee' plus `mine` (the calling admin) — no admin email or user id is
// returned, because the thread UI needs neither.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { normalizeRequestStatus } from '@/lib/requests/request-status'
import { recordActivity } from '@/lib/activity/activity'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const { data: req, error } = await db
      .from('project_requests')
      .select('id, client_id, project_id, title, description, status, response, created_at, last_activity_at')
      .eq('id', id)
      .maybeSingle()
    if (error) return queryFailure('request read', error)
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [clientRes, projectRes, projectsRes, messagesRes, activityRes] = await Promise.all([
      db.from('clients').select('id, full_name, business_name, status, merchant_id').eq('id', req.client_id).maybeSingle(),
      req.project_id ? db.from('projects').select('id, project_name, project_id, status').eq('id', req.project_id).maybeSingle() : Promise.resolve({ data: null }),
      db.from('projects').select('id, project_name, project_id').eq('client_id', req.client_id).order('created_at', { ascending: false }).limit(100),
      db
        .from('thread_messages')
        .select('id, author_role, author_user_id, body, is_internal, attachment_file_id, created_at, read_by_admin_at')
        .eq('request_id', req.id)
        .order('created_at', { ascending: true })
        .limit(500),
      db.from('activity_events').select('id, actor_role, action, summary, visibility, created_at').eq('request_id', req.id).order('created_at', { ascending: false }).limit(100),
    ])
    if (messagesRes.error) return queryFailure('thread read', messagesRes.error)

    const messages = (messagesRes.data || []) as any[]
    const fileIds = Array.from(new Set(messages.map((m) => m.attachment_file_id).filter(Boolean)))
    const files = new Map<string, string>()
    if (fileIds.length) {
      const { data: fileRows } = await db.from('project_files').select('id, file_name').in('id', fileIds).eq('client_id', req.client_id)
      for (const f of (fileRows || []) as any[]) files.set(f.id, f.file_name)
    }

    return NextResponse.json({
      request: {
        id: req.id,
        title: req.title,
        description: req.description,
        status: normalizeRequestStatus(req.status),
        rawStatus: req.status,
        createdAt: req.created_at,
        lastActivityAt: req.last_activity_at || req.created_at,
      },
      client: clientRes.data
        ? {
            id: clientRes.data.id,
            name: (clientRes.data.business_name || clientRes.data.full_name || 'Client').trim(),
            status: clientRes.data.status,
            connected: !!clientRes.data.merchant_id,
          }
        : null,
      project: projectRes.data ?? null,
      clientProjects: (projectsRes.data || []).map((p: any) => ({ id: p.id, name: (p.project_name || p.project_id || 'Project').trim() })),
      messages: messages.map((m) => ({
        id: m.id,
        from: m.author_role === 'client' ? 'client' : 'hbee',
        mine: m.author_user_id === userId,
        body: m.body,
        internal: m.is_internal === true,
        createdAt: m.created_at,
        unread: m.author_role === 'client' && !m.read_by_admin_at,
        attachmentName: m.attachment_file_id ? files.get(m.attachment_file_id) ?? 'Attachment' : null,
      })),
      activity: (activityRes.data || []).map((a: any) => ({ id: a.id, actorRole: a.actor_role, summary: a.summary, visibility: a.visibility, createdAt: a.created_at })),
    })
  } catch (error) {
    return queryFailure('request read', error)
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    for (const key of Object.keys(body)) {
      if (key !== 'project_id') return NextResponse.json({ error: `"${key}" is not a field that can be changed here.`, code: 'field_not_editable' }, { status: 400 })
    }
    if (!('project_id' in body)) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const projectId = body.project_id === null ? null : typeof body.project_id === 'string' ? body.project_id.trim() : undefined
    if (projectId === undefined || (projectId !== null && !ADMIN_UUID_RE.test(projectId))) {
      return NextResponse.json({ error: 'Invalid project.' }, { status: 400 })
    }

    const { data: req, error } = await db.from('project_requests').select('id, client_id, project_id').eq('id', id).maybeSingle()
    if (error) return queryFailure('request lookup', error)
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (projectId) {
      const { data: project } = await db.from('projects').select('id').eq('id', projectId).eq('client_id', req.client_id).maybeSingle()
      if (!project) {
        return NextResponse.json({ code: 'project_not_owned', error: 'That project does not belong to this request’s client.' }, { status: 409 })
      }
    }

    const { error: updateError } = await db.from('project_requests').update({ project_id: projectId, last_activity_at: new Date().toISOString() }).eq('id', id)
    if (updateError) return queryFailure('request update', updateError)

    await recordActivity(db, {
      clientId: req.client_id,
      projectId,
      requestId: id,
      actorUserId: userId,
      actorRole: 'admin',
      entityType: 'request',
      entityId: id,
      action: 'request_project_changed',
      summary: projectId ? 'Request linked to a project' : 'Request unlinked from its project',
      visibility: 'internal',
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return queryFailure('request update', error)
  }
}
