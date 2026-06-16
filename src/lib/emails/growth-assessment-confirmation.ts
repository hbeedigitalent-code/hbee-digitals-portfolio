// src/lib/emails/growth-assessment-confirmation.ts
// No 'use client' needed - server-side email utility

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendGrowthAssessmentConfirmation(
  contactName: string,
  email: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Growth Readiness Assessment Received</title>
        <style>
          body { 
            background: #07111F; 
            padding: 40px; 
            font-family: 'Inter', Arial, sans-serif; 
            color: #ffffff; 
            margin: 0;
          }
          .container {
            max-width: 680px; 
            margin: 0 auto; 
            background: #0E1B2D; 
            border: 1px solid #1E314A; 
            border-radius: 22px; 
            padding: 40px 48px;
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .header .badge {
            display: inline-block;
            background: linear-gradient(135deg, #FF8A00, #39D97A);
            color: #07111F;
            padding: 4px 16px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .content {
            color: #94A3B8;
            font-size: 16px;
            line-height: 1.8;
          }
          .content p {
            margin-bottom: 16px;
          }
          .content strong {
            color: #ffffff;
          }
          .pillars {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
            margin: 24px 0;
            padding: 0;
            list-style: none;
          }
          .pillars li {
            background: #07111F;
            padding: 8px 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 13px;
            color: #94A3B8;
            border: 1px solid #1E314A;
          }
          .pillars li span {
            display: block;
            font-weight: 600;
          }
          .pillars .orange span { color: #FF8A00; }
          .pillars .green span { color: #39D97A; }
          .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #1E314A;
            color: #64748B;
            font-size: 14px;
          }
          .footer a {
            color: #39D97A;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          @media (max-width: 600px) {
            body { padding: 20px; }
            .container { padding: 24px; }
            .pillars { grid-template-columns: 1fr 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">Assessment Received</div>
            <h1>Growth Readiness Assessment</h1>
          </div>
          
          <div class="content">
            <p>Hi ${contactName},</p>
            
            <p>Thank you for completing the <strong>Hbee Growth Readiness Assessment™</strong>.</p>
            
            <p>Your submission has been received and will be reviewed against our five growth pillars:</p>
            
            <ul class="pillars">
              <li class="orange"><span>Visibility</span> 20 pts</li>
              <li class="green"><span>Conversion</span> 20 pts</li>
              <li class="orange"><span>Retention</span> 20 pts</li>
              <li class="green"><span>Authority</span> 20 pts</li>
              <li class="orange"><span>Scalability</span> 20 pts</li>
            </ul>
            
            <p>Our review team will prepare your Growth Profile and follow up once the review process is complete.</p>
            
            <p>Estimated review time: <strong>2–5 business days</strong></p>
          </div>
          
          <div class="footer">
            <p>
              Warm regards,<br>
              <strong style="color:#ffffff;">Hbee Digitals</strong>
            </p>
            <p>
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
      to: email,
      subject: 'Growth Readiness Assessment Received',
      html,
    })
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    // Don't throw - we don't want to fail the request if email fails
  }
}