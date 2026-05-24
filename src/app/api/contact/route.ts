import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

function replaceVariables(template: string, variables: Record<string, string>) {
  let output = template || ''

  Object.entries(variables).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
  })

  return output
}

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

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return NextResponse.json(
        { error: 'Server email/database environment variables are missing.' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const resend = new Resend(resendApiKey)

    const body = await req.json()

    const fullName = body.fullName || body.name || ''
    const email = body.email || ''
    const company = body.company || ''
    const phone = body.phone || ''
    const service = body.service || ''
    const budget = body.budget || ''
    const timeline = body.timeline || ''
    const website = body.website || ''
    const message = body.message || ''

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: 'Please fill in your name, email, and project message.' },
        { status: 400 }
      )
    }

    const { data: inquiry, error: dbError } = await supabase
      .from('contact_submissions')
      .insert([
        {
          full_name: fullName,
          email,
          company,
          phone,
          website,
          service,
          budget,
          timeline,
          message,
          status: 'new',
          is_read: false,
          source: 'website_contact_form',
        },
      ])
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { error: 'Unable to save your inquiry right now.' },
        { status: 500 }
      )
    }

    const variables = {
      name: fullName,
      fullName,
      email,
      company,
      phone,
      website,
      service,
      budget,
      timeline,
      message,
    }

    async function getTemplate(slug: string) {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      return data
    }

    const adminTemplate = await getTemplate('admin-inquiry-notification')
    const customerTemplate = await getTemplate('contact-auto-reply')

    const adminSubject = replaceVariables(
      adminTemplate?.subject || 'New Hbee Digitals Inquiry from {{name}}',
      variables
    )

    const adminHtml = replaceVariables(
      adminTemplate?.body_html ||
        `
          <h2>New Project Inquiry</h2>
          <p><strong>Name:</strong> {{name}}</p>
          <p><strong>Email:</strong> {{email}}</p>
          <p><strong>Company:</strong> {{company}}</p>
          <p><strong>Phone:</strong> {{phone}}</p>
          <p><strong>Website:</strong> {{website}}</p>
          <p><strong>Service:</strong> {{service}}</p>
          <p><strong>Budget:</strong> {{budget}}</p>
          <p><strong>Timeline:</strong> {{timeline}}</p>
          <p><strong>Message:</strong></p>
          <p>{{message}}</p>
        `,
      variables
    )

    const customerSubject = replaceVariables(
      customerTemplate?.subject || 'We received your inquiry — Hbee Digitals',
      variables
    )

    const customerHtml = replaceVariables(
      customerTemplate?.body_html ||
        `
          <h2>Your inquiry has been received.</h2>
          <p>Hi {{name}},</p>
          <p>Thank you for reaching out to Hbee Digitals.</p>
          <p>We’ll review your project details and respond shortly.</p>
          <p>Regards,<br/>Hbee Digitals</p>
        `,
      variables
    )

    const adminTo =
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.CONTACT_TO_EMAIL ||
      'hello@hbeedigitals.com'

    const replyTo = process.env.RESEND_REPLY_TO || 'hello@hbeedigitals.com'

    const adminEmail = await resend.emails.send({
      from: 'Hbee Digitals <forms@send.hbeedigitals.com>',
      to: adminTo,
      replyTo: email,
      subject: adminSubject,
      html: wrapEmail(adminHtml),
    })

    const customerEmail = await resend.emails.send({
      from: 'Hbee Digitals <noreply@send.hbeedigitals.com>',
      to: email,
      replyTo,
      subject: customerSubject,
      html: wrapEmail(customerHtml),
    })

    await supabase.from('email_logs').insert([
      {
        template_slug: 'admin-inquiry-notification',
        recipient_email: adminTo,
        recipient_name: 'Hbee Digitals Admin',
        subject: adminSubject,
        resend_id: adminEmail.data?.id || null,
        related_inquiry_id: inquiry.id,
        status: 'sent',
      },
      {
        template_slug: 'contact-auto-reply',
        recipient_email: email,
        recipient_name: fullName,
        subject: customerSubject,
        resend_id: customerEmail.data?.id || null,
        related_inquiry_id: inquiry.id,
        status: 'sent',
      },
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unable to submit inquiry right now.' },
      { status: 500 }
    )
  }
}