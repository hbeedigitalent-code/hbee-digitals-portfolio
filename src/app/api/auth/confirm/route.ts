// src/app/api/auth/confirm/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const redirectTo = searchParams.get('redirect_to') || '/client-confirmation'

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
      // Check if client profile exists, create if not
      try {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle()

        if (!existingClient) {
          await supabase.from('clients').insert({
            user_id: data.user.id,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Client',
            email: data.user.email,
            business_name: data.user.user_metadata?.business_name || 'My Business',
            status: 'active',
          })
        }
      } catch (err) {
        console.error('Client creation error:', err)
        // Don't fail the confirmation, just log
      }

      // User is confirmed - redirect to confirmation page with success
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}${redirectTo}?confirmed=true`
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