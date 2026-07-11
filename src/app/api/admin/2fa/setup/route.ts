// src/app/api/admin/2fa/setup/route.ts
import { NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

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
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or email' },
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

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Hbee Digitals (${email})`,
      issuer: 'Hbee Digitals'
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Check if user already has a record
    const { data: existing } = await supabase
      .from('admin_2fa')
      .select('id')
      .eq('user_id', userId)
      .single()

    let error
    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('admin_2fa')
        .update({
          secret: secret.base32,
          is_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      error = updateError
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('admin_2fa')
        .insert({
          user_id: userId,
          secret: secret.base32,
          is_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      error = insertError
    }

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl
    })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Setup failed' },
      { status: 500 }
    )
  }
}