import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Dynamic import to avoid build-time issues
    const { supabase } = await import('@/lib/supabase')
    
    const { to, subject, html, name, email, message } = await request.json()

    // Get email settings from database
    const { data: settings } = await supabase
      .from('email_settings')
      .select('*')
      .single()

    if (!settings || !settings.admin_email) {
      console.error('Email settings not configured')
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
    }

    // Log the email (since we're not using a real SMTP service)
    console.log('=== EMAIL NOTIFICATION ===')
    console.log('To:', to || settings.admin_email)
    console.log('Subject:', subject)
    console.log('From:', `${settings.from_name} <${settings.from_email || 'noreply@hbeedigitals.com'}>`)
    console.log('Message:', message)
    console.log('========================')

    return NextResponse.json({ success: true, message: 'Email logged successfully' })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
