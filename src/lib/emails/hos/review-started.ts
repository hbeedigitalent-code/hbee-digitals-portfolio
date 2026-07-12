// src/lib/emails/hos/review-started.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailData {
  firstName: string
  email: string
  portalUrl: string
}

export async function sendReviewStartedEmail(data: EmailData) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review Started - Hbee Digitals</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a2e; }
    .email-wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .email-container { background: #ffffff; border-radius: 24px; padding: 48px 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e8ecf1; }
    .email-header { text-align: center; margin-bottom: 32px; }
    .email-logo { display: inline-block; font-size: 28px; font-weight: 800; color: #0B1628; text-decoration: none; }
    .email-logo span { color: #F97316; }
    .badge { display: inline-block; background: #3B82F6; color: #ffffff; padding: 6px 18px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 12px; }
    .email-content h1 { font-size: 26px; font-weight: 700; color: #0B1628; margin-bottom: 8px; line-height: 1.2; }
    .email-content p { font-size: 16px; color: #475569; margin: 12px 0; line-height: 1.7; }
    .email-content p strong { color: #0B1628; }
    .review-areas { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 24px; margin: 20px 0; }
    .review-areas li { padding: 6px 0; color: #475569; list-style: none; }
    .review-areas li::before { content: "• "; color: #F97316; font-weight: 700; }
    .btn-secondary { display: inline-block; background: transparent; color: #F97316; padding: 14px 40px; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 16px; border: 2px solid #F97316; margin: 8px 0; }
    .journey-tracker { background: #f8fafc; border-radius: 16px; padding: 20px 24px; margin: 24px 0; border: 1px solid #e2e8f0; }
    .journey-tracker .title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 12px; }
    .journey-steps { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .journey-step { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; color: #64748b; }
    .journey-step .icon { display: inline-block; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; font-size: 10px; background: #e2e8f0; color: #64748b; }
    .journey-step.active .icon { background: #F97316; color: #ffffff; }
    .journey-step.done .icon { background: #39D97A; color: #ffffff; }
    .journey-step.done { color: #39D97A; }
    .journey-step.active { color: #F97316; font-weight: 700; }
    .journey-line { width: 16px; height: 2px; background: #e2e8f0; flex-shrink: 0; }
    .journey-line.done { background: #39D97A; }
    .signoff { margin-top: 24px; padding: 20px 24px; background: #f8fafc; border-radius: 12px; border-left: 4px solid #3B82F6; }
    .signoff .name { font-weight: 700; color: #0B1628; font-size: 16px; }
    .signoff .title { color: #64748b; font-size: 13px; }
    .email-footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px; }
    .email-footer a { color: #F97316; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0B1628; }
      .email-container { background: #0E1B2D; border-color: #1E314A; }
      .email-content h1 { color: #ffffff; }
      .email-content p { color: #94a3b8; }
      .email-content p strong { color: #ffffff; }
      .email-logo { color: #ffffff; }
      .review-areas { background: #07111F; border-color: #1E314A; }
      .review-areas li { color: #94a3b8; }
      .journey-tracker { background: #07111F; border-color: #1E314A; }
      .journey-step { color: #64748b; }
      .journey-step .icon { background: #1E314A; color: #64748b; }
      .journey-step.active .icon { background: #F97316; color: #ffffff; }
      .journey-step.done .icon { background: #39D97A; color: #ffffff; }
      .journey-step.done { color: #39D97A; }
      .journey-step.active { color: #F97316; }
      .journey-line { background: #1E314A; }
      .journey-line.done { background: #39D97A; }
      .signoff { background: #07111F; border-left-color: #3B82F6; }
      .signoff .name { color: #ffffff; }
      .signoff .title { color: #94a3b8; }
      .email-footer { border-color: #1E314A; color: #64748b; }
      .btn-secondary { color: #F97316; border-color: #F97316; }
      .btn-secondary:hover { background: #F97316; color: #ffffff; }
    }
    @media (max-width: 480px) {
      .email-container { padding: 28px 20px; border-radius: 16px; }
      .email-wrapper { padding: 20px 12px; }
      .email-content h1 { font-size: 22px; }
      .btn-secondary { display: block; text-align: center; padding: 14px 24px; }
      .journey-steps { gap: 4px; }
      .journey-step { font-size: 10px; }
      .journey-line { width: 10px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <a href="https://www.hbeedigitals.com" class="email-logo">Hbee <span>Digitals</span></a>
        <div class="badge">Review Started</div>
      </div>
      <div class="email-content">
        <h1>Your Growth Review Has Started</h1>
        <p>Hi <strong>${data.firstName}</strong>,</p>
        <p>I just wanted to personally let you know that we've started reviewing your business.</p>
        <p>Thank you again for completing the Growth Readiness Assessment.</p>
        <p>Over the next <strong>12–48 hours</strong>, we'll be evaluating your business to understand its current position, identify meaningful growth opportunities, and determine whether it qualifies for our current <strong>Q3 Growth Support Initiative</strong>.</p>
        <div class="review-areas">
          <p style="font-weight: 700; color: #0B1628; dark-mode-color: #ffffff; margin-bottom: 8px;">At this stage we're looking at:</p>
          <ul>
            <li>Growth positioning</li>
            <li>Customer acquisition</li>
            <li>Customer experience</li>
            <li>Trust & credibility</li>
            <li>Growth opportunities</li>
            <li>Overall implementation readiness</li>
          </ul>
        </div>
        <div class="journey-tracker">
          <div class="title">Your HOS Journey</div>
          <div class="journey-steps">
            <span class="journey-step done"><span class="icon">✓</span> Submitted</span>
            <span class="journey-line done"></span>
            <span class="journey-step active"><span class="icon">●</span> Review</span>
            <span class="journey-line"></span>
            <span class="journey-step"><span class="icon">○</span> Profile</span>
            <span class="journey-line"></span>
            <span class="journey-step"><span class="icon">○</span> Strategy</span>
            <span class="journey-line"></span>
            <span class="journey-step"><span class="icon">○</span> Proposal</span>
            <span class="journey-line"></span>
            <span class="journey-step"><span class="icon">○</span> Onboarding</span>
          </div>
        </div>
        <p>If we need any clarification while reviewing your submission, we'll contact you directly.</p>
        <p>Otherwise, you'll receive another update as soon as your Growth Profile is ready.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${data.portalUrl}" class="btn-secondary">Open Client Portal</a>
        </p>
        <p>Thank you for your patience.</p>
        <div class="signoff">
          <p style="margin: 0;"><span class="name">Habeeb Ismaila</span><br><span class="title">CEO &amp; Founder, Hbee Digitals</span></p>
        </div>
      </div>
      <div class="email-footer">
        <p style="margin-bottom: 4px;"><strong style="color: #0B1628; dark-mode-color: #ffffff;">Hbee Digitals</strong></p>
        <p style="font-size: 12px; margin-top: 8px; color: #94a3b8;"><a href="https://www.hbeedigitals.com">www.hbeedigitals.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <noreply@send.hbeedigitals.com>',
      to: data.email,
      subject: 'Your Growth Review Has Started',
      html,
    })
    console.log('✅ Review started email sent to:', data.email)
  } catch (error) {
    console.error('Error sending review started email:', error)
  }
}