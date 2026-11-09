// src/app/api/admin/2fa/status/route.ts
//
// Tells the caller whether TOTP verification is required, deriving the acting
// user from the current Supabase session — never from a browser-supplied id.
// This is the ONLY place besides /api/admin/2fa/login that reads
// admin_2fa.is_enabled, and it always does so with the service-role client.
// The browser never queries admin_2fa directly.
//
// ENROLLMENT IS MANDATORY (src/lib/admin-2fa-policy.ts). This route used to stamp the
// "2FA verified" cookie for any admin with no 2FA record, treating "nothing to verify" as
// "verified" — so an admin who never enrolled, or whose second factor had been switched
// off, was let straight in. It now stamps only under the explicit opt-out
// ADMIN_2FA_ENROLLMENT=optional. By default an un-enrolled admin gets
// `enrollmentRequired: true` and NO cookie: the cookie is issued by completing enrollment
// (/api/admin/2fa/verify) or by a TOTP login, never by this status check.
//
// It also fails CLOSED: if admin_2fa cannot be read, nobody is stamped. Previously a read
// error looked exactly like "not enrolled" and was waved through.
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAdmin2FACookieOptions, ADMIN_2FA_COOKIE_NAME, signAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import { decideTwoFactorStatus, enrollmentPolicy } from '@/lib/admin-2fa-policy'

// Lazy, non-throwing service-role client — see login/route.ts for why this
// does not import the shared src/lib/supabaseAdmin.ts singleton.
let supabaseAdminClient: any = null

function getServiceRoleClient() {
  if (supabaseAdminClient) return supabaseAdminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return null
  }

  const { createClient } = require('@supabase/supabase-js')
  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseAdminClient
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

    const { data: adminRow, error: adminError } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (adminError || !adminRow) {
      return NextResponse.json({ error: 'Not authorized as admin' }, { status: 403 })
    }

    const { data: twoFAData, error: twoFAError } = await adminClient
      .from('admin_2fa')
      .select('is_enabled')
      .eq('user_id', user.id)
      .maybeSingle()

    const decision = decideTwoFactorStatus({
      readFailed: Boolean(twoFAError),
      enabled: Boolean(twoFAData?.is_enabled),
      policy: enrollmentPolicy(),
    })

    if (decision.kind === 'error') {
      console.error(`[2fa/status] admin_2fa read failed (code=${(twoFAError as { code?: string } | null)?.code ?? 'n/a'}) — nobody is stamped`)
      return NextResponse.json({ error: 'Failed to determine 2FA status' }, { status: 500 })
    }

    if (decision.kind === 'challenge') {
      return NextResponse.json({ enabled: true, ready: false, enrollmentRequired: false })
    }

    if (decision.kind === 'enroll') {
      // No cookie is issued. The admin must enroll first.
      return NextResponse.json({ enabled: false, ready: false, enrollmentRequired: true })
    }

    // decision.kind === 'stamp': the explicit, temporary opt-out (ADMIN_2FA_ENROLLMENT=optional).
    console.warn('[2fa/status] ADMIN_2FA_ENROLLMENT=optional: stamping an un-enrolled admin (security downgrade)')
    const cookieValue = await signAdmin2FACookie(user.id)
    if (!cookieValue) {
      console.error('❌ ADMIN_2FA_COOKIE_SECRET is not set — cannot stamp verification state')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    const response = NextResponse.json({ enabled: false, ready: true, enrollmentRequired: false })
    response.cookies.set(ADMIN_2FA_COOKIE_NAME, cookieValue, getAdmin2FACookieOptions())
    return response
  } catch (error: any) {
    console.error('2FA status error:', error)
    return NextResponse.json({ error: 'Failed to determine 2FA status' }, { status: 500 })
  }
}
