// src/app/api/admin/2fa/verify/route.ts
//
// Confirms the first TOTP code during setup and flips admin_2fa.is_enabled to
// true. The acting user is derived from the current Supabase session — never
// trusted from the request body — so this can only ever enable 2FA for the
// caller's own account.
import { NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimit } from '@/lib/rate-limit'
import { TWO_FACTOR_MESSAGES } from '@/lib/admin-2fa-policy'
import { getAdmin2FACookieOptions, ADMIN_2FA_COOKIE_NAME, signAdmin2FACookie } from '@/lib/admin-2fa-cookie'

// Lazy, non-throwing service-role client — see login/route.ts for why this
// does not import the shared src/lib/supabaseAdmin.ts singleton.
let supabaseClient: any = null

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase environment variables not available')
    return null
  }

  const { createClient } = require('@supabase/supabase-js')
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseClient
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing verification code' },
        { status: 400 },
      )
    }

    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 },
      )
    }

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json(
        { success: false, error: 'User is not authorized as admin' },
        { status: 403 },
      )
    }

    // Brute-force guard: TOTP is a 6-digit code, so attempts are limited per admin account (not per IP).
    const limit = await checkRateLimit('adminTotp', user.id)
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: TWO_FACTOR_MESSAGES.tooManyAttempts },
        { status: 429, headers: limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : undefined },
      )
    }

    // Get user's 2FA secret
    const { data, error } = await supabase
      .from('admin_2fa')
      .select('secret')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: '2FA not set up' },
        { status: 400 },
      )
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: data.secret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 },
      )
    }

    // Backup codes are NOT generated, stored or returned: nothing in the app accepts them at login, so showing
    // them would promise a recovery path that does not exist. Lost-authenticator recovery is owner-assisted.
    // Enable 2FA for the user (is_enabled only; backup_codes is left untouched).
    const { error: updateError } = await supabase
      .from('admin_2fa')
      .update({
        is_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 })
    }

    // The admin just proved TOTP possession right now — stamp the current
    // session as verified too, so they are not immediately re-challenged.
    // Best-effort: if the cookie secret is missing, 2FA is still enabled
    // correctly in the database; the admin will simply hit the challenge
    // (and its own fail-closed error) on their next /admin/* request.
    const cookieValue = await signAdmin2FACookie(user.id)

    const response = NextResponse.json({ success: true })
    if (cookieValue) {
      response.cookies.set(ADMIN_2FA_COOKIE_NAME, cookieValue, getAdmin2FACookieOptions())
    }
    return response
  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 },
    )
  }
}
