// src/app/api/client-portal/projects/[id]/route.ts
//
// GET — ONE project of the CALLER's own client account, with the real related rows the
// workspace page shows: milestones, recent files, deliverables and project requests.
//
// Ownership: projects.id = :id AND projects.client_id = <clients.id from the session>. A project
// that is missing, belongs to another client, or has a malformed id returns the SAME 404, so the
// route cannot be used to enumerate project ids. Everything related is then fetched ONLY through
// that verified project id (files and requests additionally carry the client id).
//
// Allow-list only. No raw rows: no file_url (deliverables expose `hasFile`; downloads go through
// /api/client-portal/deliverables/[id]/signed-url and /api/client-portal/files/[id]/signed-url),
// no storage paths, no client id, no admin columns. A failed related query is reported in
// `unavailable` rather than being shown as "nothing here".

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
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

    const projectId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(projectId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: clientRow } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!clientRow?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: project, error: projectError } = await adminClient
      .from('projects')
      .select('id, project_id, project_name, status, progress, description, start_date, expected_completion_date, created_at')
      .eq('id', projectId)
      .eq('client_id', clientRow.id)
      .maybeSingle()

    if (projectError) {
      console.error('[client-portal/projects/id] project query failed')
      return NextResponse.json({ error: 'Failed to load this project' }, { status: 500 })
    }
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const unavailable: string[] = []
    const rows = <T,>(label: string, result: { data: T[] | null; error: unknown }): T[] => {
      if (result.error) {
        unavailable.push(label)
        console.error(`[client-portal/projects/id] ${label} query failed`)
        return []
      }
      return result.data || []
    }

    const [milestonesRes, filesRes, deliverablesRes, requestsRes] = await Promise.all([
      adminClient
        .from('project_milestones')
        .select('id, title, description, status, due_date')
        .eq('project_id', project.id)
        .order('due_date', { ascending: true })
        .limit(50),
      adminClient
        .from('project_files')
        .select('id, file_name, file_type, file_size, uploaded_at')
        .eq('project_id', project.id)
        .eq('client_id', clientRow.id)
        .order('uploaded_at', { ascending: false })
        .limit(5),
      adminClient
        .from('project_deliverables')
        .select('id, title, description, version, status, uploaded_at, file_url')
        .eq('project_id', project.id)
        .order('uploaded_at', { ascending: false })
        .limit(10),
      adminClient
        .from('project_requests')
        .select('id, title, status, created_at')
        .eq('project_id', project.id)
        .eq('client_id', clientRow.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const milestones = rows<any>('milestones', milestonesRes)
    const files = rows<any>('files', filesRes)
    const deliverables = rows<any>('deliverables', deliverablesRes)
    const requests = rows<any>('requests', requestsRes)

    return NextResponse.json({
      project: {
        id: project.id,
        reference: project.project_id || null,
        name: (project.project_name || '').trim() || 'Untitled project',
        status: project.status || null,
        progress: project.progress ?? null,
        description: typeof project.description === 'string' ? project.description : null,
        startDate: project.start_date || null,
        expectedCompletion: project.expected_completion_date || null,
      },
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description || null,
        status: m.status || null,
        dueDate: m.due_date || null,
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type || null,
        size: Number.isFinite(Number(f.file_size)) ? Number(f.file_size) : null,
        uploadedAt: f.uploaded_at || null,
      })),
      deliverables: deliverables.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description || null,
        version: d.version || null,
        status: d.status || null,
        uploadedAt: d.uploaded_at || null,
        hasFile: typeof d.file_url === 'string' && d.file_url.trim().length > 0,
      })),
      requests: requests.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status || null,
        createdAt: r.created_at || null,
      })),
      unavailable,
    })
  } catch (error) {
    console.error('❌ Client project detail error:', error)
    return NextResponse.json({ error: 'Failed to load this project' }, { status: 500 })
  }
}
