// src/app/api/client-portal/requests/route.ts
//
// GET — the CALLER's own project requests, as an allow-list (replaces the browser-side
// project_requests.select('*') under RLS). Scope: auth.uid() -> clients row -> clients.id ->
// project_requests.client_id. The request carries no parameters. Project names are resolved only
// through this client's own projects, so a request pointing at someone else's project id shows no
// project name.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'

export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const adminClient = portal.db
    const user = portal.user

        const clientId: string = portal.client.id

    const [requestsRes, projectsRes] = await Promise.all([
      adminClient
        .from('project_requests')
        .select('id, title, description, status, created_at, response, project_id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(200),
      adminClient.from('projects').select('id, project_name, project_id').eq('client_id', clientId).limit(200),
    ])

    if (requestsRes.error) {
      console.error('[client-portal/requests] requests query failed')
      return NextResponse.json({ error: 'Failed to load your requests' }, { status: 500 })
    }

    const projects = new Map<string, string>()
    for (const p of (projectsRes.data || []) as any[]) {
      projects.set(p.id, (p.project_name || '').trim() || (p.project_id || '').trim() || 'Untitled project')
    }

    return NextResponse.json({
      requests: (requestsRes.data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: typeof r.description === 'string' ? r.description : null,
        status: r.status || null,
        createdAt: r.created_at || null,
        response: typeof r.response === 'string' && r.response.trim() ? r.response : null,
        projectName: r.project_id ? projects.get(r.project_id) ?? null : null,
      })),
      projectsUnavailable: !!projectsRes.error,
    })
  } catch (error) {
    console.error('❌ Client requests list error:', error)
    return NextResponse.json({ error: 'Failed to load your requests' }, { status: 500 })
  }
}
