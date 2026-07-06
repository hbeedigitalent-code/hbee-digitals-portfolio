// src/lib/emails/onboarding-confirmation.ts
import { Resend } from 'resend'

// Only initialize Resend if API key exists
const resendApiKey = process.env.RESEND_API_KEY
const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendOnboardingConfirmation(
  fullName: string,
  email: string,
  projectId: string
) {
  if (!resend) {
    console.warn('Resend API key not configured - skipping email send')
    return
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Details Received — ${projectId}</title>
  <style>
    /* Email client reset */
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

    /* Container */
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

    /* Header */
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
      background: linear-gradient(135deg, #F97316, #39D97A);
      color: #ffffff;
      padding: 6px 18px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-top: 12px;
    }

    /* Content */
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

    /* Project ID Box */
    .project-id-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .project-id-box .label {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .project-id-box .id {
      font-size: 28px;
      font-weight: 700;
      color: #F97316;
      letter-spacing: 0.05em;
      margin-top: 4px;
      display: block;
    }

    /* CTA Button */
    .btn-primary {
      display: inline-block;
      background: #F97316;
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
      background: #EA580C;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
    }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 28px 0;
    }

    /* Steps */
    .steps {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 20px 0;
      padding: 0;
      list-style: none;
    }
    .steps li {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid #e2e8f0;
    }
    .steps li .step-num {
      display: inline-block;
      width: 24px;
      height: 24px;
      background: #F97316;
      color: #ffffff;
      border-radius: 50%;
      text-align: center;
      font-weight: 700;
      font-size: 12px;
      line-height: 24px;
      flex-shrink: 0;
    }

    /* Footer */
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
    .social-links {
      margin: 16px 0 8px;
      display: flex;
      justify-content: center;
      gap: 16px;
    }
    .social-links a {
      color: #94a3b8;
      font-size: 14px;
      text-decoration: none;
    }
    .social-links a:hover {
      color: #F97316;
    }

    /* ============================================ */
    /* DARK MODE SUPPORT (Auto-detects device theme) */
    /* ============================================ */
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
      .project-id-box {
        background: #07111F;
        border-color: #1E314A;
      }
      .project-id-box .label {
        color: #64748b;
      }
      .divider {
        border-color: #1E314A;
      }
      .steps li {
        background: #07111F;
        border-color: #1E314A;
        color: #94a3b8;
      }
      .btn-primary {
        background: linear-gradient(135deg, #F97316, #EA580C);
      }
      .btn-primary:hover {
        box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);
      }
      .email-footer {
        border-color: #1E314A;
        color: #64748b;
      }
      .email-footer a {
        color: #F97316;
      }
      .social-links a {
        color: #64748b;
      }
      .social-links a:hover {
        color: #F97316;
      }
    }

    /* Mobile Responsive */
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
      .steps {
        grid-template-columns: 1fr;
      }
      .project-id-box .id {
        font-size: 22px;
      }
      .btn-primary {
        display: block;
        text-align: center;
        padding: 14px 24px;
      }
    }

    /* Gmail App Fixes */
    .gmail-fix {
      display: none !important;
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
        <div class="badge">Onboarding Received</div>
      </div>

      <!-- Content -->
      <div class="email-content">
        <h1>Project Details Received</h1>

        <p>Hi <strong>${fullName}</strong>,</p>

        <p>Thank you for completing your onboarding with <strong>Hbee Digitals</strong>.</p>

        <p>Your project details, files, and requirements have been received and are now under review.</p>

        <div class="project-id-box">
          <span class="label">Your Project ID</span>
          <span class="id">${projectId}</span>
        </div>

        <p>Here's what happens next:</p>

        <ul class="steps">
          <li><span class="step-num">1</span> Review by project team</li>
          <li><span class="step-num">2</span> Project kickoff planning</li>
          <li><span class="step-num">3</span> Team assignment</li>
          <li><span class="step-num">4</span> Kickoff meeting</li>
        </ul>

        <p style="text-align: center; margin: 28px 0 8px;">
          <a href="https://www.hbeedigitals.com/client-portal" class="btn-primary">
            View Your Project
          </a>
        </p>

        <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-top: 8px;">
          You'll receive updates as your project progresses.
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
        <div class="social-links">
          <a href="https://www.hbeedigitals.com">🌐 Website</a>
          <a href="mailto:hello@hbeedigitals.com">✉️ Email</a>
        </div>
        <p style="font-size: 12px; margin-top: 8px; color: #94a3b8;">
          © ${new Date().getFullYear()} Hbee Digitals. All rights reserved.
        </p>
        <p style="font-size: 11px; color: #94a3b8;">
          <a href="https://www.hbeedigitals.com/privacy" style="color: #94a3b8; text-decoration: underline;">
            Privacy Policy
          </a>
          &nbsp;·&nbsp;
          <a href="https://www.hbeedigitals.com/terms" style="color: #94a3b8; text-decoration: underline;">
            Terms of Service
          </a>
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
      to: email,
      subject: `Project Details Received — ${projectId}`,
      html,
    })
    console.log('✅ Onboarding confirmation email sent to:', email)
  } catch (error) {
    console.error('Error sending onboarding confirmation email:', error)
  }
}