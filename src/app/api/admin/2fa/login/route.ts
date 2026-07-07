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

    console.log('🔍 2FA Login attempt for userId:', userId)

    // Get user's 2FA secret
    const { data: twoFAData, error: twoFAError } = await supabase
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

    // Verify token
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

    // ✅ 2FA IS VERIFIED - CHECK IF USER IS ADMIN
    // Try by user_id first
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (adminError) {
      console.error('❌ Admin check error:', adminError)
    }

    // If not found by user_id, try by email
    let adminUser = adminData

    if (!adminUser) {
      console.log('🔍 Admin not found by user_id, trying by email...')
      
      // Get the user's email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      
      if (userData?.user?.email) {
        const { data: emailData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', userData.user.email)
          .eq('is_active', true)
          .maybeSingle()
        
        adminUser = emailData
      }
    }

    if (!adminUser) {
      console.error('❌ User is NOT admin - userId:', userId)
      return NextResponse.json(
        { success: false, error: 'User is not authorized as admin' },
        { status: 403 }
      )
    }

    console.log('✅ Admin verified:', adminUser.email)

    // ✅ USER IS ADMIN - ALLOW ACCESS
    return NextResponse.json({ 
      success: true,
      admin: adminUser
    })

  } catch (error: any) {
    console.error('Login verify error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Verification failed' }, { status: 500 })
  }
}