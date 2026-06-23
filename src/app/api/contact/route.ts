// src/app/api/contact/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

function wrapEmail(content: string) {
  return `
    <div style="background:#07111F;padding:40px;font-family:Arial,sans-serif;color:#ffffff;">
      <div style="max-width:680px;margin:0 auto;background:#0E1B2D;border:1px solid #1E314A;border-radius:22px;padding:28px;">
        <p style="color:#39D97A;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">
          Hbee Digitals
        </p>
        ${content}
      </div>
    </div>
  `
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendApiKey = process.env.RESEND_API_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Database configuration error. Please try again later.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    console.log('📥 Received form submission:', { formType: body.form_type, source: body.source })

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    let resend = null
    if (resendApiKey) {
      resend = new Resend(resendApiKey)
    }

    const formType = body.form_type || 'contact'
    const source = body.source || 'website_contact_form'

    // Extract fields
    let fullName = ''
    let email = ''
    let company = ''
    let phone = ''
    let service = ''
    let message = ''
    let businessName = ''
    let websiteUrl = ''
    let serviceInterest = ''
    let preferredContact = ''
    let currentChallenge = ''

    if (formType === 'free_consultation') {
      fullName = body.full_name || ''
      email = body.email || ''
      phone = body.phone || ''
      businessName = body.business_name || ''
      websiteUrl = body.website_url || ''
      serviceInterest = body.service_interest || ''
      currentChallenge = body.message || body.current_challenge || ''
      preferredContact = body.preferred_contact || body.contact_method || ''
      message = currentChallenge
      company = businessName
      service = serviceInterest
    } else {
      fullName = body.fullName || body.name || ''
      email = body.email || ''
      company = body.company || ''
      phone = body.phone || ''
      service = body.service || ''
      message = body.message || ''
      websiteUrl = body.website || ''
    }

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: 'Please fill in your name, email, and message.' },
        { status: 400 }
      )
    }

    // Insert into database
    const { data: inquiry, error: dbError } = await supabase
      .from('contact_submissions')
      .insert([
        {
          full_name: fullName,
          email,
          company: company || businessName || null,
          phone: phone || null,
          website: websiteUrl || null,
          service: service || serviceInterest || null,
          message,
          form_type: formType,
          source: source,
          status: 'new',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Unable to save your inquiry. Please try again.' },
        { status: 500 }
      )
    }

    // Send confirmation email
    if (resend) {
      try {
        const customerHtml = `
          <h2 style="color:#ffffff;font-size:24px;font-weight:700;">Thank You for Reaching Out!</h2>
          <p style="color:#94A3B8;">Hi ${fullName},</p>
          <p style="color:#94A3B8;">Thank you for contacting Hbee Digitals. We have received your ${formType === 'free_consultation' ? 'consultation request' : 'inquiry'}.</p>
          <p style="color:#94A3B8;">Our team will review your details and get back to you within 24 hours.</p>
          <div style="margin-top:24px;padding-top:24px;border-top:1px solid #1E314A;">
            <p style="color:#64748B;">— The Hbee Digitals Team</p>
          </div>
        `

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <noreply@send.hbeedigitals.com>',
          to: email,
          subject: formType === 'free_consultation' ? 'Your Free Consultation Request' : 'We received your inquiry',
          html: wrapEmail(customerHtml),
        })

        const adminHtml = `
          <h2 style="color:#ffffff;font-size:24px;font-weight:700;">New ${formType === 'free_consultation' ? 'Consultation' : 'Inquiry'}</h2>
          <p style="color:#94A3B8;"><strong style="color:#ffffff;">Name:</strong> ${fullName}</p>
          <p style="color:#94A3B8;"><strong style="color:#ffffff;">Email:</strong> ${email}</p>
          <p style="color:#94A3B8;"><strong style="color:#ffffff;">Phone:</strong> ${phone || 'Not provided'}</p>
          <p style="color:#94A3B8;"><strong style="color:#ffffff;">Business:</strong> ${businessName || company || 'Not provided'}</p>
          <p style="color:#94A3B8;"><strong style="color:#ffffff;">Message:</strong> ${message}</p>
        `

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <forms@send.hbeedigitals.com>',
          to: process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com',
          subject: `New ${formType === 'free_consultation' ? 'Consultation' : 'Inquiry'} from ${fullName}`,
          html: wrapEmail(adminHtml),
        })
      } catch (emailError) {
        console.error('Email sending error:', emailError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      form_type: formType,
      message: 'Form submitted successfully!'
    })
    
  } catch (error: any) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: error.message || 'Unable to submit inquiry right now.' },
      { status: 500 }
    )
  }
}