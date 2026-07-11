// src/app/api/admin/2fa/verify/route.ts
import { NextResponse } from 'next/server'
import speakeasy from 'speakeasy'

// Lazy initialize Supabase
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
    const { userId, token } = await request.json()

    if (!userId || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or token' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get user's 2FA secret
    const { data, error } = await supabase
      .from('admin_2fa')
      .select('secret')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: '2FA not setup' },
        { status: 400 }
      )
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: data.secret,
      encoding: 'base32',
      token: token,
      window: 1
    })

    if (verified) {
      // Generate backup codes
      const backupCodes = Array.from({ length: 8 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      )

      // Enable 2FA for user and save backup codes
      const { error: updateError } = await supabase
        .from('admin_2fa')
        .update({
          is_enabled: true,
          backup_codes: backupCodes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, backupCodes })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid verification code' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}