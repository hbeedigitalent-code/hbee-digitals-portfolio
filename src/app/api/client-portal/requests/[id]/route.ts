// src/app/api/client-portal/requests/[id]/route.ts
//
// GET — ONE request of the CALLER's own client account, with its conversation and its client-visible history.
//
// Ownership: project_requests.id = :id AND project_requests.client_id = <clients.id from the session>, in one
// query. A request that is missing, belongs to another client, or has a malformed id returns the SAME 404, so
// the route cannot be used to enumerate ids, and a different client's thread returns no data at all.
//
// INTERNAL NOTES NEVER REACH THIS ROUTE'S RESPONSE. The messages query filters is_internal = false in the
// database query itself (not after the fact), selects an explicit column list that omits is_internal and
// author ids, and the activity query filters visibility = 'client'. The author is reduced to
// 'you' | 'hbee' — no admin identity of any kind is exposed.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { normalizeRequestStatus, CLIENT_STATUS_HINTS } from '@/lib/requests/request-status'
import { UUID_RE } from '@/lib/requests/request-service'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const db = portal.db
    const clientId: string = portal.client.id

    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: req, error } = await db
      .from('project_requests')
      .select('id, title, description, status, created_at, project_id, last_activity_at')
      .eq('id', id)
      .eq('client_id', clientId)
      .maybeSingle()
    if (error) {
      console.error('[client-portal/requests/id] request query failed')
      return NextResponse.json({ error: 'Failed to load this request' }, { status: 500 })
    }
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [messagesRes, activityRes, projectRes] = await Promise.all([
      db
        .from('thread_messages')
        .select('id, author_role, body, created_at, read_by_client_at, attachment_file_id')
        .eq('request_id', req.id)
        .eq('client_id', clientId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true })
        .limit(500),
      db
        .from('activity_events')
        .select('id, action, summary, created_at')
        .eq('request_id', req.id)
        .eq('client_id', clientId)
        .eq('visibility', 'client')
        .order('created_at', { ascending: false })
        .limit(50),
      req.project_id
        ? db.from('projects').select('id, project_name, project_id').eq('id', req.project_id).eq('client_id', clientId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    const status = normalizeRequestStatus(req.status)
    return NextResponse.json({
      request: {
        id: req.id,
        title: req.title,
        description: typeof req.description === 'string' ? req.description : null,
        status,
        statusHint: CLIENT_STATUS_HINTS[status],
        createdAt: req.created_at || null,
        lastActivityAt: req.last_activity_at || req.created_at || null,
        canReply: status !== 'closed',
        canClose: status === 'answered',
        project: projectRes.data
          ? { id: projectRes.data.id, name: (projectRes.data.project_name || '').trim() || projectRes.data.project_id || 'Project' }
          : null,
      },
      messages: ((messagesRes.data || []) as any[]).map((m) => ({
        id: m.id,
        from: m.author_role === 'client' ? 'you' : 'hbee',
        body: m.body,
        createdAt: m.created_at,
        unread: m.author_role === 'admin' && !m.read_by_client_at,
        hasAttachment: !!m.attachment_file_id,
      })),
      activity: ((activityRes.data || []) as any[]).map((a) => ({ id: a.id, summary: a.summary, createdAt: a.created_at })),
      unavailable: [messagesRes.error && 'messages', activityRes.error && 'activity'].filter(Boolean),
    })
  } catch (error) {
    console.error('❌ Client request detail error:', error)
    return NextResponse.json({ error: 'Failed to load this request' }, { status: 500 })
  }
}
