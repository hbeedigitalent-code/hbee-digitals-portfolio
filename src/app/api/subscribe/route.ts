import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, name, source = 'website_footer' } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const emailLower = email.toLowerCase().trim()

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          email: emailLower,
          name: name || null,
          source,
          status: 'active',
          segment: 'lead',
          updated_at: now,
          created_at: now,
        },
        { onConflict: 'email' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed!',
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    )
  }
}