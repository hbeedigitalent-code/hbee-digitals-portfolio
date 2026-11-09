// src/app/api/admin/2fa/setup/route.ts
//
// Generates a new TOTP secret + QR code for the CURRENT session's user. The
// acting user (and their email, for the QR label) is derived from the
// Supabase session — never trusted from the request body — so one admin can
// never trigger a secret rotation for another admin's account.
import { NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { hasVerifiedTwoFactor } from '@/lib/admin-api-auth'
import { TWO_FACTOR_MESSAGES } from '@/lib/admin-2fa-policy'

// Lazy, non-throwing service-role client — mirrors the pattern this route
// already used before this change. Deliberately does NOT import the shared
// src/lib/supabaseAdmin.ts singleton, which throws at module-load time if
// SUPABASE_SERVICE_ROLE_KEY is missing; that would crash this whole route
// instead of returning a clean "Server configuration error" response.
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

export async function POST() {
  try {
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

    // GUARD. This route only needed a signed-in admin SESSION, so anyone holding just a password could replace an
    // enrolled admin's secret and flip is_enabled to false — and the old status route then stamped them as verified.
    // Replacing or restarting an ENABLED second factor now requires a completed 2FA verification (the signed cookie).
    // First-time enrollment (nothing enabled yet) does not, because that is how the cookie is first earned.
    const { data: current, error: currentError } = await supabase
      .from('admin_2fa')
      .select('id, is_enabled')
      .eq('user_id', user.id)
      .maybeSingle()

    if (currentError) {
      console.error('[2fa/setup] admin_2fa read failed')
      return NextResponse.json({ success: false, error: 'Setup failed' }, { status: 500 })
    }

    if (current?.is_enabled === true && !(await hasVerifiedTwoFactor(user.id))) {
      return NextResponse.json({ success: false, error: TWO_FACTOR_MESSAGES.verifyFirst }, { status: 403 })
    }

    const email = user.email || 'admin'

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Hbee Digitals (${email})`,
      issuer: 'Hbee Digitals',
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // The record read above doubles as the existence check.
    const existing = current

    let error
    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('admin_2fa')
        .update({
          secret: secret.base32,
          is_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
      error = updateError
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('admin_2fa')
        .insert({
          user_id: user.id,
          secret: secret.base32,
          is_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      error = insertError
    }

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ success: false, error: 'Setup failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
    })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Setup failed' },
      { status: 500 },
    )
  }
}
