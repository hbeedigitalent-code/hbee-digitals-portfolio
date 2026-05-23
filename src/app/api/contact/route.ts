import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      fullName,
      email,
      company,
      phone,
      service,
      budget,
      timeline,
      website,
      message,
    } = body

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: 'Please fill in your name, email, and project message.' },
        { status: 400 }
      )
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <onboarding@resend.dev>'
    const toEmail = process.env.CONTACT_TO_EMAIL || 'contact@hbeedigitals.com'

    const html = `
      <div style="font-family: Arial, sans-serif; background:#07111F; color:#ffffff; padding:32px;">
        <div style="max-width:680px; margin:0 auto; background:#0E1B2D; border:1px solid #1E314A; border-radius:22px; padding:28px;">
          <p style="color:#39D97A; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase;">New Project Inquiry</p>
          <h1 style="margin:10px 0 20px; font-size:28px;">${fullName} submitted a project inquiry</h1>

          <div style="background:#07111F; border:1px solid #1E314A; border-radius:16px; padding:20px; margin-top:20px;">
            <p><strong>Name:</strong> ${fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
            <p><strong>Website:</strong> ${website || 'Not provided'}</p>
            <p><strong>Service:</strong> ${service || 'Not selected'}</p>
            <p><strong>Budget:</strong> ${budget || 'Not selected'}</p>
            <p><strong>Timeline:</strong> ${timeline || 'Not selected'}</p>
          </div>

          <div style="background:#07111F; border:1px solid #1E314A; border-radius:16px; padding:20px; margin-top:20px;">
            <h2 style="font-size:18px;">Project Message</h2>
            <p style="line-height:1.7;">${String(message).replace(/\n/g, '<br/>')}</p>
          </div>
        </div>
      </div>
    `

    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `New Hbee Digitals Inquiry from ${fullName}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unable to send inquiry right now. Please try again later.' },
      { status: 500 }
    )
  }
}