// src/app/api/client-portal/requests/route.ts
//
// GET — the CALLER's own project requests, as an allow-list. Scope: auth.uid() -> clients row -> clients.id ->
// project_requests.client_id. The request carries no parameters. Project names are resolved only through this
// client's own projects, so a request pointing at someone else's project id shows no project name.
//
// S6.3: each request now carries its canonical status (legacy values mapped), the last-activity time and the
// number of Hbee replies the client has not yet read. The unread count comes from PUBLIC (non-internal)
// messages only — an internal note can never contribute to it, so it cannot be inferred from the count.
// `response` (the legacy single reply) is still returned for backwards compatibility.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { normalizeRequestStatus } from '@/lib/requests/request-status'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const adminClient = portal.db
    const clientId: string = portal.client.id

    const [requestsRes, projectsRes, unreadRes] = await Promise.all([
      adminClient
        .from('project_requests')
        .select('id, title, description, status, created_at, response, project_id, last_activity_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(200),
      adminClient.from('projects').select('id, project_name, project_id').eq('client_id', clientId).limit(200),
      adminClient
        .from('thread_messages')
        .select('request_id')
        .eq('client_id', clientId)
        .eq('author_role', 'admin')
        .eq('is_internal', false)
        .is('read_by_client_at', null)
        .limit(1000),
    ])

    if (requestsRes.error) {
      console.error('[client-portal/requests] requests query failed')
      return NextResponse.json({ error: 'Failed to load your requests' }, { status: 500 })
    }

    const projects = new Map<string, string>()
    for (const p of (projectsRes.data || []) as any[]) {
      projects.set(p.id, (p.project_name || '').trim() || (p.project_id || '').trim() || 'Untitled project')
    }

    const unread = new Map<string, number>()
    for (const m of (unreadRes.data || []) as any[]) unread.set(m.request_id, (unread.get(m.request_id) || 0) + 1)

    const list = (requestsRes.data || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: typeof r.description === 'string' ? r.description : null,
      status: normalizeRequestStatus(r.status),
      createdAt: r.created_at || null,
      lastActivityAt: r.last_activity_at || r.created_at || null,
      response: typeof r.response === 'string' && r.response.trim() ? r.response : null,
      projectName: r.project_id ? projects.get(r.project_id) ?? null : null,
      unreadReplies: unread.get(r.id) || 0,
    }))
    list.sort((a: any, b: any) => String(b.lastActivityAt).localeCompare(String(a.lastActivityAt)))

    return NextResponse.json({
      requests: list,
      projectsUnavailable: !!projectsRes.error,
      // The thread feature is only partly available if its table cannot be read (e.g. migration pending).
      threadsUnavailable: !!unreadRes.error,
    })
  } catch (error) {
    console.error('❌ Client requests list error:', error)
    return NextResponse.json({ error: 'Failed to load your requests' }, { status: 500 })
  }
}
