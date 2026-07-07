// src/app/api/admin/2fa/login/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import speakeasy from 'speakeasy'

// Use SERVICE ROLE key for admin checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Regular client for 2FA (uses anon key)
const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(request: Request) {
  try {
    const { userId, token } = await request.json()

    if (!userId || !token) {
      return NextResponse.json({ success: false, error: 'Missing userId or token' }, { status: 400 })
    }

    console.log('🔍 2FA Login attempt for userId:', userId)

    // 1. Get user's 2FA secret (using anon client)
    const { data: twoFAData, error: twoFAError } = await supabaseAnon
      .from('admin_2fa')
      .select('secret, is_enabled')
      .eq('user_id', userId)
      .single()

    if (twoFAError || !twoFAData) {
      console.error('❌ 2FA data error:', twoFAError)
      return NextResponse.json({ success: false, error: '2FA not setup' }, { status: 400 })
    }

    if (!twoFAData.is_enabled) {
      console.error('❌ 2FA not enabled')
      return NextResponse.json({ success: false, error: '2FA not enabled' }, { status: 400 })
    }

    // 2. Verify token
    const verified = speakeasy.totp.verify({
      secret: twoFAData.secret,
      encoding: 'base32',
      token: token,
      window: 1
    })

    if (!verified) {
      console.error('❌ Invalid 2FA code')
      return NextResponse.json({ success: false, error: 'Invalid verification code' }, { status: 400 })
    }

    console.log('✅ 2FA verified for userId:', userId)

    // 3. CHECK IF USER IS ADMIN - USING SERVICE ROLE (BYPASSES RLS)
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (adminError) {
      console.error('❌ Admin check error:', adminError)
    }

    if (!adminData) {
      console.error('❌ User is NOT admin - userId:', userId)
      return NextResponse.json(
        { success: false, error: 'User is not authorized as admin' },
        { status: 403 }
      )
    }

    console.log('✅ Admin verified:', adminData.email)

    // ✅ USER IS ADMIN - ALLOW ACCESS
    return NextResponse.json({ 
      success: true,
      admin: adminData
    })

  } catch (error: any) {
    console.error('Login verify error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Verification failed' }, { status: 500 })
  }
}