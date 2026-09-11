// src/app/api/admin/proposals/[id]/files/route.ts
//
// GET — list one proposal's attachments (metadata only).
//
// UPLOAD MOVED. This route used to accept a multipart POST that streamed the
// whole file through the function. Two problems with that: it was a second
// upload transport with no progress, no resume and no cancellation; and Vercel
// documents a 4.5 MB request-body limit for Functions, so a file above that is
// EXPECTED to fail with 413 FUNCTION_PAYLOAD_TOO_LARGE against a 25 MB declared
// maximum. That size limitation is INFERRED from the documented platform limit
// and has not been reproduced in production here.
//
// Proposal uploads now use the single signed-TUS transport, via
// POST /api/uploads/initiate and POST /api/uploads/finalize with
// context = "proposal". The permissions are unchanged and are enforced by
// authorizeUploadTarget() in src/lib/uploads/upload-session.ts: session ->
// user-bound 2FA -> active admin row -> the proposal must exist, with client_id
// copied from the STORED proposal. The 25 MB cap and the PDF/DOC/DOCX/PPT/PPTX/
// XLS/XLSX/CSV allow-list are preserved unchanged in upload-config.ts.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/admin/:path*), so
// session, 2FA and active-admin are re-verified here independently.
//
// object_path never leaves the server: it is excluded from the select() itself.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — the same defensive pattern used by
// the other /api/admin routes. Deliberately NOT the shared
// src/lib/supabaseAdmin.ts singleton, which throws at import time when
// SUPABASE_SERVICE_ROLE_KEY is missing.
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Metadata only. object_path is excluded from the select() itself, not merely
// from the response mapping, so it is never pulled from the database here.
const FILE_METADATA_COLUMNS = 'id, proposal_id, file_name, file_type, file_size, uploaded_at'

type AuthResult =
  | { ok: true; adminClient: any; userId: string }
  | { ok: false; response: NextResponse }

async function requireActiveAdmin(): Promise<AuthResult> {
  // 1-2. Derive the caller from THEIR OWN session — never a client-supplied
  //      id/email/role/isAdmin flag of any kind.
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 3-4. Verify the signed 2FA attestation cookie — the same function
  //      middleware uses, checked BEFORE any admin_users / service-role query.
  const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
  const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
  if (!twoFAVerified) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    }
  }

  // 7. Service-role client obtained only after session + 2FA succeed.
  const adminClient = getServiceRoleClient()
  if (!adminClient) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }),
    }
  }

  // 5-6. Active-admin status, verified server-side.
  const { data: adminRow } = await adminClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!adminRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 }),
    }
  }

  return { ok: true, adminClient, userId: user.id }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { adminClient } = auth

    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: proposalRow } = await adminClient
      .from('proposals')
      .select('id')
      .eq('id', proposalId)
      .maybeSingle()

    if (!proposalRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: fileRows, error: filesError } = await adminClient
      .from('proposal_files')
      .select(FILE_METADATA_COLUMNS)
      .eq('proposal_id', proposalId)
      .order('uploaded_at', { ascending: false })

    if (filesError) {
      console.error('❌ Failed to list proposal files:', filesError)
      return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
    }

    return NextResponse.json({ files: fileRows || [] })
  } catch (error) {
    console.error('❌ Proposal file list error:', error)
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 })
  }
}
