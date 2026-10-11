// src/app/api/client-portal/projects/route.ts
//
// GET — the CALLER's own projects for the Projects list, as an allow-list.
//
// Replaces the browser-side projects.select('*') under RLS: that returned every column of each
// row, including any internal ones. Scope comes from the session alone:
//   auth.uid() -> clients row -> clients.id -> projects.client_id
// The request carries no parameters.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

export async function GET() {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: clientRows, error: clientError } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .limit(2)

    if (clientError) {
      console.error('[client-portal/projects] client lookup failed')
      return NextResponse.json({ error: 'Failed to load your projects' }, { status: 500 })
    }
    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (clientRows.length > 1) {
      console.error(`[client-portal/projects] ambiguous client ownership for user ${user.id}`)
      return NextResponse.json({ state: 'ambiguous' }, { status: 409 })
    }

    const { data: rows, error } = await adminClient
      .from('projects')
      .select('id, project_id, project_name, status, progress, description, start_date, expected_completion_date, created_at')
      .eq('client_id', clientRows[0].id)
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
