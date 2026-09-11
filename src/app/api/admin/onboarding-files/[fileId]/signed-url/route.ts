// src/app/api/admin/onboarding-files/[fileId]/signed-url/route.ts
//
// Short-lived signed URL for ONE client_onboarding_files row, for an active
// 2FA-verified admin.
//
// WHY THIS EXISTS. /admin/client-onboarding/[id] linked straight to
// client_onboarding_files.file_url, which is a PUBLIC Storage URL — readable by
// anyone who has it, signed in or not, for as long as the bucket stayed public.
// Once M10 makes onboarding-files private, that link resolves to nothing, so
// this route is the replacement and must be deployed BEFORE that migration runs.
//
// Not covered by middleware.ts (its matcher is /admin/:path*,
// /admin-2fa-challenge and /client-portal/:path*, not /api/*), so session, 2FA
// and active-admin membership are all verified here independently, in the same
// order as every other admin route: session -> user-bound 2FA (SAME generic 401,
// checked BEFORE any admin_users query) -> privileged client -> active admin row.
//
// This is NOT a generic privileged endpoint: the row is addressed by the route
// parameter, the bucket is a constant, and the object path is derived from the
// row's own stored value through a validating helper that fails closed.

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import {
  ONBOARDING_FILES_BUCKET,
  toOnboardingFilesObjectPath,
} from '@/lib/onboarding-storage-path'

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

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } },
) {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verified BEFORE any admin_users query, returning the SAME generic 401 as
    // a missing session, so a signed-in non-admin learns nothing.
    const cookieValue = cookies().get(ADMIN_2FA_COOKIE_NAME)?.value
    const twoFAVerified = await verifyAdmin2FACookie(cookieValue, user.id)
    if (!twoFAVerified) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: adminRow, error: adminLookupError } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    // A lookup that cannot answer "yes" is never read as "yes".
    if (adminLookupError || !adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    const fileId = typeof params.fileId === 'string' ? params.fileId.trim() : ''
    if (!UUID_RE.test(fileId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: fileRow, error: rowError } = await adminClient
      .from('client_onboarding_files')
      .select('id, project_id, file_url, file_name')
      .eq('id', fileId)
      .maybeSingle()

    if (rowError) {
      console.error(
        `[onboarding-files] row read failed (code=${
          (rowError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }
    if (!fileRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // The path is derived from the row's OWN stored value and scoped to the
    // row's OWN project folder. Fail closed: the raw value never reaches Storage.
    const objectPath = toOnboardingFilesObjectPath(fileRow.file_url, fileRow.project_id)
    if (!objectPath) {
      console.error(
        '[onboarding-files] unable to resolve a safe object path for row',
        fileRow.id,
      )
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { data: signedData, error: signError } = await adminClient.storage
      .from(ONBOARDING_FILES_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRY_SECONDS)

    if (signError || !signedData) {
      console.error('[onboarding-files] failed to create signed URL:', signError)
      return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
    }

    // Only the signed URL. It is short-lived and is never written back into the
    // database — the stored reference stays the canonical object path.
    return NextResponse.json({ url: signedData.signedUrl })
  } catch (error) {
    console.error('[onboarding-files] signed URL route error:', error)
    return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
  }
}
