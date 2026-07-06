// src/lib/emails/admin-onboarding-notification.ts
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
  if (!resend) {
    console.warn('Resend API key not configured - skipping admin email')
    return
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Onboarding Submission — ${projectId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .email-container {
      background: #ffffff;
      border-radius: 24px;
      padding: 48px 40px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e8ecf1;
    }
    .email-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .email-logo {
      display: inline-block;
      font-size: 28px;
      font-weight: 800;
      color: #0B1628;
      text-decoration: none;
    }
    .email-logo span {
      color: #F97316;
    }
    .badge {
      display: inline-block;
      background: #F97316;
      color: #ffffff;
      padding: 6px 18px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 12px;
    }
    .email-content {
      color: #1a1a2e;
    }
    .email-content h1 {
      font-size: 26px;
      font-weight: 700;
      color: #0B1628;
      margin-bottom: 8px;
      line-height: 1.2;
    }
    .email-content p {
      font-size: 16px;
      color: #475569;
      margin: 12px 0;
      line-height: 1.7;
    }
    .email-content p strong {
      color: #0B1628;
    }
    .detail-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      margin: 20px 0;
    }
    .detail-box .row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-box .row:last-child {
      border-bottom: none;
    }
    .detail-box .label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }
    .detail-box .value {
      font-weight: 600;
      color: #0B1628;
      font-size: 14px;
    }
    .detail-box .value.highlight {
      color: #F97316;
    }
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #F97316, #EA580C);
      color: #ffffff;
      padding: 14px 40px;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      transition: all 0.3s ease;
      margin: 8px 0;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);
    }
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 28px 0;
    }
    .email-footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
    }
    .email-footer a {
      color: #F97316;
      text-decoration: none;
    }
    .email-footer a:hover {
      text-decoration: underline;
    }

    /* Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0B1628;
      }
      .email-container {
        background: #0E1B2D;
        border-color: #1E314A;
      }
      .email-content {
        color: #e2e8f0;
      }
      .email-content h1 {
        color: #ffffff;
      }
      .email-content p {
        color: #94a3b8;
      }
      .email-content p strong {
        color: #ffffff;
      }
      .email-logo {
        color: #ffffff;
      }
      .detail-box {
        background: #07111F;
        border-color: #1E314A;
      }
      .detail-box .row {
        border-color: #1E314A;
      }
      .detail-box .label {
        color: #64748b;
      }
      .detail-box .value {
        color: #ffffff;
      }
      .divider {
        border-color: #1E314A;
      }
      .btn-primary {
        background: linear-gradient(135deg, #F97316, #EA580C);
      }
      .email-footer {
        border-color: #1E314A;
        color: #64748b;
      }
      .email-footer a {
        color: #F97316;
      }
    }

    @media (max-width: 480px) {
      .email-container {
        padding: 28px 20px;
        border-radius: 16px;
      }
      .email-wrapper {
        padding: 20px 12px;
      }
      .email-content h1 {
        font-size: 22px;
      }
      .detail-box .row {
        flex-direction: column;
        padding: 10px 0;
      }
      .btn-primary {
        display: block;
        text-align: center;
        padding: 14px 24px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <a href="https://www.hbeedigitals.com" class="email-logo">
          Hbee <span>Digitals</span>
        </a>
        <div class="badge">🔔 New Onboarding</div>
      </div>

      <!-- Content -->
      <div class="email-content">
        <h1>New Client Onboarding Submission</h1>

        <p>A new client onboarding form has been submitted.</p>

        <div class="detail-box">
          <div class="row">
            <span class="label">Contact</span>
            <span class="value">${fullName}</span>
          </div>
          <div class="row">
            <span class="label">Business</span>
            <span class="value">${businessName}</span>
          </div>
          <div class="row">
            <span class="label">Email</span>
            <span class="value">${email}</span>
          </div>
          <div class="row">
            <span class="label">Project ID</span>
            <span class="value highlight">${projectId}</span>
          </div>
        </div>

        <p>Review the full submission and prepare the project for kickoff.</p>

        <p style="text-align: center; margin: 28px 0;">
          <a href="https://www.hbeedigitals.com/admin/client-onboarding" class="btn-primary">
            View in Admin Dashboard
          </a>
        </p>

        <p style="font-size: 14px; color: #94a3b8; text-align: center;">
          This is an automated notification. Please review the submission in the admin dashboard.
        </p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p style="margin-bottom: 4px;">
          <strong style="color: #0B1628; dark-mode-color: #ffffff;">Hbee Digitals</strong>
        </p>
        <p style="font-size: 13px;">
          Premium websites, ecommerce systems, and conversion-focused digital experiences.
        </p>
        <p style="font-size: 12px; margin-top: 8px; color: #94a3b8;">
          © ${new Date().getFullYear()} Hbee Digitals. All rights reserved.
        </p>
        <p style="font-size: 11px; color: #94a3b8;">
          <a href="https://www.hbeedigitals.com" style="color: #94a3b8; text-decoration: none;">www.hbeedigitals.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <noreply@send.hbeedigitals.com>',
      to: adminEmail,
      subject: `New Onboarding Submission — ${projectId}`,
      html,
    })
    console.log('✅ Admin onboarding notification sent to:', adminEmail)
  } catch (error) {
    console.error('Error sending admin onboarding notification:', error)
  }
}