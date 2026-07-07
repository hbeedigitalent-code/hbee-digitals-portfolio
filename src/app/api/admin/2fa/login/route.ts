// src/app/api/admin/2fa/login/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import speakeasy from 'speakeasy'

export async function POST(request: Request) {
  try {
    const { userId, token } = await request.json()

    if (!userId || !token) {
      return NextResponse.json({ success: false, error: 'Missing userId or token' }, { status: 400 })
    }

    // Get user's 2FA secret
    const { data, error } = await supabase
      .from('admin_2fa')
      .select('secret, is_enabled')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ success: false, error: '2FA not setup' }, { status: 400 })
    }

    if (!data.is_enabled) {
      return NextResponse.json({ success: false, error: '2FA not enabled' }, { status: 400 })
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: data.secret,
      encoding: 'base32',
      token: token,
      window: 1
    })

    if (!verified) {
      return NextResponse.json({ success: false, error: 'Invalid verification code' }, { status: 400 })
    }

    // ✅ 2FA IS VERIFIED - NOW CHECK IF USER IS ADMIN
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (adminError || !adminData) {
      console.error('Admin check error:', adminError)
      return NextResponse.json(
        { success: false, error: 'User is not authorized as admin' },
        { status: 403 }
      )
    }

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