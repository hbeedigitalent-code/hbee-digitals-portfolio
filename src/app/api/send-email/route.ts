import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { name, email, phone, budget, message, projectDetails, subject } = await request.json()

    // Format budget for display
    const budgetLabels: Record<string, string> = {
      'under-5k': 'Under $5,000',
      '5k-10k': '$5,000 - $10,000',
      '10k-25k': '$10,000 - $25,000',
      '25k-50k': '$25,000 - $50,000',
      '50k-plus': '$50,000+',
      'not-sure': 'Not sure / TBD',
    }

    const formattedBudget = budgetLabels[budget] || budget || 'Not specified'

    // Log the inquiry (for debugging)
    console.log('=== NEW PROJECT INQUIRY ===')
    console.log('Subject:', subject || 'New Project Inquiry')
    console.log('Name:', name)
    console.log('Email:', email)
    console.log('Phone:', phone || 'Not provided')
    console.log('Budget:', formattedBudget)
    console.log('Message:', message)
    console.log('Additional Details:', projectDetails || 'None')
    console.log('==========================')

    // Send email to admin using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Hbee Digitals <onboarding@resend.dev>",
      to: [process.env.ADMIN_EMAIL || "hello.hbeedigitals@gmail.com"],
      subject: subject || `New Project Inquiry from ${name}`,
      replyTo: email,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Project Inquiry</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #0A1D37 0%, #1a3a5c 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: 600; color: #0A1D37; display: block; margin-bottom: 5px; }
            .value { background: #f3f4f6; padding: 10px 15px; border-radius: 8px; margin: 0; }
            .message-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 5px; line-height: 1.6; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; background: #f9fafb; }
            .button { display: inline-block; padding: 10px 20px; background: #007BFF; color: white; text-decoration: none; border-radius: 8px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📬 New Project Inquiry</h1>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">👤 From:</span>
                <p class="value">${name}</p>
              </div>
              <div class="field">
                <span class="label">📧 Email:</span>
                <p class="value"><a href="mailto:${email}" style="color: #007BFF;">${email}</a></p>
              </div>
              ${phone ? `
              <div class="field">
                <span class="label">📞 Phone:</span>
                <p class="value">${phone}</p>
              </div>
              ` : ''}
              <div class="field">
                <span class="label">💰 Budget Range:</span>
                <p class="value">${formattedBudget}</p>
              </div>
              <hr>
              <div class="field">
                <span class="label">📝 Project Description:</span>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
              </div>
              ${projectDetails ? `
              <div class="field">
                <span class="label">📎 Additional Details:</span>
                <div class="message-box">${projectDetails.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}
              <hr>
              <div style="text-align: center;">
                <a href="mailto:${email}?subject=Re: Your project inquiry" class="button">Reply to ${name}</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Hbee Digitals. All rights reserved.</p>
              <p style="font-size: 11px;">This inquiry came from your website contact form.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send confirmation email to the user
    const { error: confirmError } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Hbee Digitals <onboarding@resend.dev>",
      to: [email],
      subject: `Thank you for reaching out, ${name}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Thank you for reaching out</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #0A1D37 0%, #1a3a5c 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .button { display: inline-block; padding: 12px 24px; background: #007BFF; color: white; text-decoration: none; border-radius: 8px; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; background: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Reaching Out! 🎉</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for contacting <strong>Hbee Digitals</strong>. We've received your project inquiry and will get back to you within <strong>24 hours</strong>.</p>
              <p>Here's what you submitted:</p>
              <ul>
                <li><strong>Project Description:</strong> ${message.substring(0, 150)}${message.length > 150 ? '...' : ''}</li>
                <li><strong>Budget Range:</strong> ${formattedBudget}</li>
              </ul>
              <p>In the meantime, feel free to explore our work:</p>
              <div style="text-align: center;">
                <a href="https://hbeedigitals.vercel.app/portfolio" class="button">View Our Portfolio</a>
              </div>
              <hr>
              <p style="font-size: 14px; color: #666;">
                If you have any immediate questions, feel free to reply to this email.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Hbee Digitals. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (confirmError) {
      console.error('Confirmation email error:', confirmError)
      // Don't fail the request if only confirmation fails
    }

    console.log('Email sent successfully:', data?.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Inquiry received successfully' 
    })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to process inquiry' }, { status: 500 })
  }
}