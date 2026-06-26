// src/app/api/auth/confirm/route.ts
// No 'use client' needed - API route

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const type = searchParams.get('type')

  if (!token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=missing_token`
    )
  }

  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'recovery' ? 'recovery' : 'signup',
    })

    if (error) {
      console.error('Confirmation error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=verification_failed`
      )
    }

    if (data.user) {
      // User is confirmed - redirect to confirmation page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?confirmed=true`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=unknown`
    )
  } catch (error) {
    console.error('Confirmation error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation?error=server_error`
    )
  }
}