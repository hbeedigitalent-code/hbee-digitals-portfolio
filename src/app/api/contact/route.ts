// src/app/api/contact/route.ts
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

async function verifyTurnstileToken(token: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  
  if (!secretKey) {
    console.error('❌ Turnstile: Secret key missing')
    return { success: false, error: 'Security configuration error' }
  }

  try {
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    console.log('🔍 Turnstile verification response:', data)

    if (data.success === true) {
      return { success: true }
    } else {
      const errorCodes = data['error-codes'] || []
      console.error('❌ Turnstile verification failed:', errorCodes)
      return { success: false, error: 'Verification failed. Please try again.' }
    }
  } catch (error) {
    console.error('❌ Turnstile verification error:', error)
    return { success: false, error: 'Verification service unavailable. Please try again.' }
  }
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendApiKey = process.env.RESEND_API_KEY

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasResendApiKey: !!resendApiKey,
    })

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        { error: 'Database configuration error. Please try again later.' },
        { status: 500 }
      )
    }

    const body = await req.json()
    console.log('📥 Received form submission:', { formType: body.form_type, source: body.source })

    // Verify Turnstile token
    const turnstileToken = body.turnstile_token
    if (!turnstileToken) {
      console.error('❌ No Turnstile token provided')
      return NextResponse.json(
        { error: 'Please complete the security verification.' },
        { status: 400 }
      )
    }

    const verification = await verifyTurnstileToken(turnstileToken)
    if (!verification.success) {
      console.error('❌ Turnstile verification failed:', verification.error)
      return NextResponse.json(
        { error: verification.error || 'Security verification failed. Please try again.' },
        { status: 400 }
      )
    }

    console.log('✅ Turnstile verification passed')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    let resend = null
    if (resendApiKey) {
      resend = new Resend(resendApiKey)
    }

    // Determine form type
    const formType = body.form_type || 'contact'
    const source = body.source || 'website_contact_form'

    // Extract fields
    let fullName = ''
    let email = ''
    let company = ''
    let phone = ''
    let service = ''
    let budget = ''
    let timeline = ''
    let website = ''
    let message = ''
    let businessName = ''
    let websiteUrl = ''
    let serviceInterest = ''
    let budgetRange = ''
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
      budgetRange = body.budget_range || ''
      preferredContact = body.preferred_contact || body.contact_method || ''
      message = currentChallenge
      company = businessName
      website = websiteUrl
      service = serviceInterest
      budget = budgetRange
    } else {
      fullName = body.fullName || body.name || ''
      email = body.email || ''
      company = body.company || ''
      phone = body.phone || ''
      service = body.service || ''
      budget = body.budget || ''
      timeline = body.timeline || ''
      website = body.website || ''
      message = body.message || ''
    }

    // Validation
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
          website: website || websiteUrl || null,
          service: service || serviceInterest || null,
          budget: budget || budgetRange || null,
          timeline: timeline || null,
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

    console.log('✅ Form saved to database')

    // Try to send emails, but don't fail if they don't work
    let emailErrors = []
    
    if (resend) {
      try {
        const variables = {
          name: fullName,
          fullName,
          email,
          company: company || businessName || '',
          phone: phone || '',
          website: website || websiteUrl || '',
          service: service || serviceInterest || '',
          budget: budget || budgetRange || '',
          timeline: timeline || '',
          message,
          form_type: formType,
          business_name: businessName || '',
          website_url: websiteUrl || '',
          service_interest: serviceInterest || '',
          budget_range: budgetRange || '',
          preferred_contact: preferredContact || '',
          current_challenge: currentChallenge || '',
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

        const adminTemplateSlug = formType === 'free_consultation' 
          ? 'admin-consultation-notification' 
          : 'admin-inquiry-notification'
        
        const customerTemplateSlug = formType === 'free_consultation'
          ? 'consultation-auto-reply'
          : 'contact-auto-reply'

        let adminTemplate = await getTemplate(adminTemplateSlug)
        let customerTemplate = await getTemplate(customerTemplateSlug)

        if (!adminTemplate) {
          adminTemplate = {
            subject: formType === 'free_consultation' 
              ? 'New Free Consultation Request from {{name}}'
              : 'New Hbee Digitals Inquiry from {{name}}',
            body_html: formType === 'free_consultation'
              ? `<h2>New Free Consultation Request</h2>
                 <p><strong>Name:</strong> {{name}}</p>
                 <p><strong>Email:</strong> {{email}}</p>
                 <p><strong>Phone:</strong> {{phone}}</p>
                 <p><strong>Business:</strong> {{business_name}}</p>
                 <p><strong>Website:</strong> {{website_url}}</p>
                 <p><strong>Service Interest:</strong> {{service_interest}}</p>
                 <p><strong>Budget Range:</strong> {{budget_range}}</p>
                 <p><strong>Preferred Contact:</strong> {{preferred_contact}}</p>
                 <p><strong>Challenge:</strong></p>
                 <p>{{current_challenge}}</p>`
              : `<h2>New Project Inquiry</h2>
                 <p><strong>Name:</strong> {{name}}</p>
                 <p><strong>Email:</strong> {{email}}</p>
                 <p><strong>Company:</strong> {{company}}</p>
                 <p><strong>Phone:</strong> {{phone}}</p>
                 <p><strong>Website:</strong> {{website}}</p>
                 <p><strong>Service:</strong> {{service}}</p>
                 <p><strong>Budget:</strong> {{budget}}</p>
                 <p><strong>Message:</strong></p>
                 <p>{{message}}</p>`,
          }
        }

        if (!customerTemplate) {
          customerTemplate = {
            subject: formType === 'free_consultation'
              ? 'Your Free Consultation Request — Hbee Digitals'
              : 'We received your inquiry — Hbee Digitals',
            body_html: formType === 'free_consultation'
              ? `<h2>Your consultation request has been received.</h2>
                 <p>Hi {{name}},</p>
                 <p>Thank you for requesting a free consultation with Hbee Digitals.</p>
                 <p>We'll review your details and get back to you within 24 hours.</p>
                 <p>Regards,<br/>Hbee Digitals Team</p>`
              : `<h2>Your inquiry has been received.</h2>
                 <p>Hi {{name}},</p>
                 <p>Thank you for reaching out to Hbee Digitals.</p>
                 <p>We’ll review your project details and respond shortly.</p>
                 <p>Regards,<br/>Hbee Digitals</p>`,
          }
        }

        const adminSubject = replaceVariables(adminTemplate.subject, variables)
        const adminHtml = replaceVariables(adminTemplate.body_html, variables)
        const customerSubject = replaceVariables(customerTemplate.subject, variables)
        const customerHtml = replaceVariables(customerTemplate.body_html, variables)

        const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.CONTACT_TO_EMAIL || 'hello@hbeedigitals.com'
        const replyTo = process.env.RESEND_REPLY_TO || 'hello@hbeedigitals.com'

        await resend.emails.send({
          from: 'Hbee Digitals <forms@send.hbeedigitals.com>',
          to: adminTo,
          replyTo: email,
          subject: adminSubject,
          html: wrapEmail(adminHtml),
        })

        await resend.emails.send({
          from: 'Hbee Digitals <noreply@send.hbeedigitals.com>',
          to: email,
          replyTo,
          subject: customerSubject,
          html: wrapEmail(customerHtml),
        })
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        emailErrors.push('Email notification failed')
      }
    }

    return NextResponse.json({ 
      success: true, 
      form_type: formType,
      email_warning: emailErrors.length > 0 ? 'Form saved but email notification failed' : null
    })
    
  } catch (error: any) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: error.message || 'Unable to submit inquiry right now.' },
      { status: 500 }
    )
  }
}