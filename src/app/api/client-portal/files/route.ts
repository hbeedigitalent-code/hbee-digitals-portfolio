// src/app/api/client-portal/files/route.ts
//
// GET — the Files page's data for the CALLER's own client account: their project files,
// their projects (for labels and the upload target) and the deliverables of those projects.
//
// Replaces the browser-side reads the page used to do (project_files.select('*') and
// project_deliverables.select('*')), which put the raw stored `file_url` of every row into
// the browser. Here the response is an explicit allow-list: no file_url, no storage path,
// no client id, no internal columns. Downloads go through the signed-URL routes only.
//
// Scope comes from the session alone: auth.uid() -> clients row -> clients.id. The request
// carries no parameters. project_deliverables has no client_id, so its rows are fetched only
// through project ids this client already owns.

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
      console.error('[client-portal/files] client lookup failed')
      return NextResponse.json({ error: 'Failed to load your files' }, { status: 500 })
    }
    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (clientRows.length > 1) {
      console.error(`[client-portal/files] ambiguous client ownership for user ${user.id}`)
      return NextResponse.json({ state: 'ambiguous' }, { status: 409 })
    }
    const clientId: string = clientRows[0].id

    const [projectsRes, filesRes] = await Promise.all([
      adminClient
        .from('projects')
        .select('id, project_name, project_id, status')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(200),
      adminClient
        .from('project_files')
        .select('id, file_name, file_type, file_size, uploaded_at, project_id')
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false })
        .limit(500),
    ])

    if (projectsRes.error || filesRes.error) {
      console.error('[client-portal/files] query failed')
      return NextResponse.json({ error: 'Failed to load your files' }, { status: 500 })
    }

    const projects = (projectsRes.data || []) as Array<{ id: string; project_name: string | null; project_id: string | null; status: string | null }>

    let deliverables: Array<{
      id: string
      title: string | null
      description: string | null
      version: string | null
      status: string | null
      uploaded_at: string | null
      project_id: string | null
      file_url: string | null
    }> = []
    let deliverablesUnavailable = false

    const projectIds = projects.map((p) => p.id)
    if (projectIds.length > 0) {
      const delRes = await adminClient
        .from('project_deliverables')
        .select('id, title, description, version, status, uploaded_at, project_id, file_url')
        .in('project_id', projectIds)
        .order('uploaded_at', { ascending: false })
        .limit(100)
      if (delRes.error) {
        deliverablesUnavailable = true
        console.error('[client-portal/files] deliverables query failed')
      } else {
        deliverables = delRes.data || []
      }
    }

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        name: (p.project_name || '').trim() || (p.project_id || '').trim() || 'Untitled project',
        code: p.project_id || null,
        status: p.status || null,
      })),
      files: (filesRes.data || []).map((f: any) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type || null,
        size: Number.isFinite(Number(f.file_size)) ? Number(f.file_size) : null,
        uploadedAt: f.uploaded_at || null,
        projectId: f.project_id || null,
      })),
      deliverables: deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        version: d.version,
        status: d.status,
        uploadedAt: d.uploaded_at,
        projectId: d.project_id,
        // Only whether a download exists. The link itself never leaves the server except
        // through /api/client-portal/deliverables/[id]/signed-url.
        hasFile: typeof d.file_url === 'string' && d.file_url.trim().length > 0,
      })),
      deliverablesUnavailable,
    })
  } catch (error) {
    console.error('❌ Client files list error:', error)
    return NextResponse.json({ error: 'Failed to load your files' }, { status: 500 })
  }
}
