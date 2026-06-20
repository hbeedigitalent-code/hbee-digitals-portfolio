import { Resend } from 'resend'

// Only initialize Resend if API key exists
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendAdminOnboardingNotification(
  fullName: string,
  businessName: string,
  email: string,
  projectId: string
) {
  // Skip if Resend is not configured
  if (!resend) {
    console.warn('Resend API key not configured - skipping admin email')
    return
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New Onboarding Submission — ${projectId}</title>
        <style>
          body { background: #07111F; padding: 40px; font-family: 'Inter', Arial, sans-serif; color: #ffffff; margin: 0; }
          .container { max-width: 680px; margin: 0 auto; background: #0E1B2D; border: 1px solid #1E314A; border-radius: 22px; padding: 40px 48px; }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px; }
          .badge { display: inline-block; background: #FF8A00; color: #07111F; padding: 4px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .content { color: #94A3B8; font-size: 16px; line-height: 1.8; }
          .detail { background: #07111F; padding: 16px 20px; border-radius: 12px; margin: 8px 0 16px 0; border: 1px solid #1E314A; }
          .detail p { margin: 4px 0; }
          .detail strong { color: #ffffff; }
          .btn { display: inline-block; background: linear-gradient(135deg, #FF8A00, #39D97A); color: #07111F; padding: 12px 32px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 16px; margin-top: 8px; }
          .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #1E314A; color: #64748B; font-size: 14px; }
          .footer a { color: #39D97A; text-decoration: none; }
          @media (max-width: 600px) { body { padding: 20px; } .container { padding: 24px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">🔔 New Onboarding</div>
            <h1>New Client Onboarding Submission</h1>
          </div>
          
          <div class="content">
            <p>A new client onboarding form has been submitted.</p>
            
            <div class="detail">
              <p><strong>Contact:</strong> ${fullName}</p>
              <p><strong>Business:</strong> ${businessName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Project ID:</strong> ${projectId}</p>
            </div>
            
            <p>Review the full submission and prepare the project for kickoff.</p>
            
            <a href="https://www.hbeedigitals.com/admin/client-onboarding" class="btn">
              View in Admin Dashboard
            </a>
          </div>
          
          <div class="footer">
            <p>
              Hbee Digitals<br>
              <a href="https://www.hbeedigitals.com">www.hbeedigitals.com</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <noreply@send.hbeedigitals.com>',
      to: process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com',
      subject: `New Onboarding Submission — ${projectId}`,
      html,
    })
  } catch (error) {
    console.error('Error sending admin onboarding notification:', error)
  }
}