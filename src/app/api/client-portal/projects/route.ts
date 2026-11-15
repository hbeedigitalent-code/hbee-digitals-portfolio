// src/app/api/client-portal/projects/route.ts
//
// GET — the CALLER's own projects for the Projects list, as an allow-list.
//
// Replaces the browser-side projects.select('*') under RLS: that returned every column of each
// row, including any internal ones. Scope comes from the session alone:
//   auth.uid() -> clients row -> clients.id -> projects.client_id
// The request carries no parameters.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'

export const dynamic = 'force-dynamic'


export async function GET() {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const adminClient = portal.db
    const user = portal.user


    const { data: rows, error } = await adminClient
      .from('projects')
      .select('id, project_id, project_name, status, progress, description, start_date, expected_completion_date, created_at')
      .eq('client_id', portal.client.id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[client-portal/projects] projects query failed')
      return NextResponse.json({ error: 'Failed to load your projects' }, { status: 500 })
    }

    return NextResponse.json({
      projects: (rows || []).map((p: any) => ({
        id: p.id,
        reference: p.project_id || null,
        name: (p.project_name || '').trim() || 'Untitled project',
        status: p.status || null,
        progress: p.progress ?? null,
        description: typeof p.description === 'string' ? p.description : null,
        startDate: p.start_date || null,
        expectedCompletion: p.expected_completion_date || null,
        createdAt: p.created_at || null,
      })),
    })
  } catch (error) {
    console.error('❌ Client projects list error:', error)
    return NextResponse.json({ error: 'Failed to load your projects' }, { status: 500 })
  }
}
