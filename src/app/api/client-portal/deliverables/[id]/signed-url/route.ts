// src/app/api/client-portal/deliverables/[id]/signed-url/route.ts
//
// GET — a short-lived download link for ONE deliverable, but only if the deliverable belongs
// to the CALLER's own client account.
//
// Why this exists: the old Deliverables page rendered project_deliverables.file_url straight
// into an <a href>, read by the browser with select('*'). That put the raw stored URL of every
// row in the browser and bypassed the signed-URL pattern project_files and proposal files use.
//
// Ownership (all derived server-side, nothing from the request but the id in the path):
//   deliverable.id = :id
//   deliverable.project_id -> projects.id WHERE projects.client_id = <clients.id from session>
// A deliverable that is missing, belongs to another client's project, or whose project is
// unowned answers with the same 404, so the route cannot be used to enumerate ids.
//
// What the stored file_url may become is decided by resolveDeliverableLink:
//   - an object in THIS project's `project-files` bucket -> a 60-second signed URL (service
//     role, after authorization). Objects under another client's `client-files/` prefix are
//     refused.
//   - a plain external https link -> returned as-is with external:true. We cannot secure
//     someone else's host; it is only ever given to the owning client.
//   - anything else -> fail closed.
//
// NOTE: the project-files bucket is public today (see the project_files signed-url route).
// Signing does not make an object private while the bucket is public; it removes the raw
// URL from the browser and makes the app ready for a private bucket with no UI change.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveDeliverableLink } from '@/lib/client-portal/deliverable-link'

const PROJECT_FILES_BUCKET = 'project-files'
const SIGNED_URL_EXPIRY_SECONDS = 60
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

    const deliverableId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(deliverableId)) {
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

    const { data: deliverable } = await adminClient
      .from('project_deliverables')
      .select('id, project_id, file_url')
      .eq('id', deliverableId)
      .maybeSingle()

    if (!deliverable?.project_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // The deliverable's project must be one of THIS client's projects.
    const { data: project } = await adminClient
      .from('projects')
      .select('id')
      .eq('id', deliverable.project_id)
      .eq('client_id', clientRow.id)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const link = resolveDeliverableLink(deliverable.file_url, clientRow.id, process.env.NEXT_PUBLIC_SUPABASE_URL)
    if (!link) {
      // No file, or a link we will not hand out. Nothing about the stored value is disclosed.
      return NextResponse.json({ error: 'No download is available for this deliverable.' }, { status: 404 })
    }

    if (link.kind === 'external') {
      return NextResponse.json({ url: link.url, external: true })
    }

    const { data: signedData, error: signError } = await adminClient.storage
      .from(PROJECT_FILES_BUCKET)
      .createSignedUrl(link.path, SIGNED_URL_EXPIRY_SECONDS)

    if (signError || !signedData) {
      console.error('❌ Failed to create deliverable signed URL')
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    return NextResponse.json({ url: signedData.signedUrl, external: false })
  } catch (error) {
    console.error('❌ Client deliverable signed URL error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
