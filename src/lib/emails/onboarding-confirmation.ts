import { Resend } from 'resend'

// Only initialize Resend if API key exists
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendOnboardingConfirmation(
  fullName: string,
  email: string,
  projectId: string
) {
  // Skip if Resend is not configured
  if (!resend) {
    console.warn('Resend API key not configured - skipping email send')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Project Details Received — ${projectId}</title>
        <style>
          body { background: #07111F; padding: 40px; font-family: 'Inter', Arial, sans-serif; color: #ffffff; margin: 0; }
          .container { max-width: 680px; margin: 0 auto; background: #0E1B2D; border: 1px solid #1E314A; border-radius: 22px; padding: 40px 48px; }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
          .badge { display: inline-block; background: linear-gradient(135deg, #FF8A00, #39D97A); color: #07111F; padding: 4px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .content { color: #94A3B8; font-size: 16px; line-height: 1.8; }
          .content p { margin-bottom: 16px; }
          .content strong { color: #ffffff; }
          .project-id { background: #07111F; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 16px 0; border: 1px solid #1E314A; }
          .project-id span { color: #FF8A00; font-size: 24px; font-weight: 700; letter-spacing: 0.05em; }
          .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #1E314A; color: #64748B; font-size: 14px; }
          .footer a { color: #39D97A; text-decoration: none; }
          @media (max-width: 600px) { body { padding: 20px; } .container { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">Onboarding Received</div>
            <h1>Project Details Received</h1>
          </div>
          
          <div class="content">
            <p>Hi ${fullName},</p>
            
            <p>Thank you for completing your onboarding.</p>
            
            <p>Your project details, files, and requirements have been received.</p>
            
            <div class="project-id">
              <p style="color:#94A3B8;font-size:14px;margin-bottom:4px;">Your Project ID</p>
              <span>${projectId}</span>
            </div>
            
            <p>Our team will review everything and follow up if any additional information is needed before work begins.</p>
          </div>
          
          <div class="footer">
            <p>
              Warm regards,<br>
              <strong style="color:#ffffff;">Hbee Digitals</strong>
            </p>
            <p><a href="https://www.hbeedigitals.com">www.hbeedigitals.com</a></p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <noreply@send.hbeedigitals.com>',
      to: email,
      subject: `Project Details Received — ${projectId}`,
      html,
    })
  } catch (error) {
    console.error('Error sending onboarding confirmation email:', error)
  }
}