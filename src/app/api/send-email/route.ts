import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, budget, message } = body;

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
    const TO_EMAIL = process.env.BREVO_TO_EMAIL;

    if (!BREVO_API_KEY || !FROM_EMAIL || !TO_EMAIL) {
      console.error('Missing environment variables');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    // Prepare email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          h2 { color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #4a5568; }
          .value { margin-top: 5px; }
          .message { background: #f7fafc; padding: 15px; border-radius: 5px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>📬 New Project Inquiry</h2>
          
          <div class="field">
            <div class="label">Name:</div>
            <div class="value">${name}</div>
          </div>
          
          <div class="field">
            <div class="label">Email:</div>
            <div class="value">${email}</div>
          </div>
          
          ${phone ? `
          <div class="field">
            <div class="label">Phone:</div>
            <div class="value">${phone}</div>
          </div>
          ` : ''}
          
          ${budget ? `
          <div class="field">
            <div class="label">Budget:</div>
            <div class="value">${budget}</div>
          </div>
          ` : ''}
          
          <div class="field">
            <div class="label">Message:</div>
            <div class="message">${message.replace(/\n/g, '<br>')}</div>
          </div>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #718096;">
            Sent from Hbee Digitals contact form
          </p>
        </div>
      </body>
      </html>
    `;

    // Call Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Hbee Digitals',
          email: FROM_EMAIL,
        },
        to: [
          {
            email: TO_EMAIL,
            name: 'Hbee Digitals Team',
          },
        ],
        replyTo: {
          email: email,
          name: name,
        },
        subject: `New Project Inquiry from ${name}`,
        htmlContent: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API Error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send email.' },
        { status: response.status }
      );
    }

    // Optional: Send auto-reply to customer
    // Uncomment this if you want to send a confirmation email back to the user
    /*
    const autoReplyResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Hbee Digitals',
          email: FROM_EMAIL,
        },
        to: [{ email: email, name: name }],
        subject: 'Thank you for contacting Hbee Digitals',
        htmlContent: `
          <h2>Thank you for reaching out!</h2>
          <p>Dear ${name},</p>
          <p>We have received your inquiry and will get back to you within 24 hours.</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>Hbee Digitals Team</strong></p>
        `,
      }),
    });
    */

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email sent successfully!',
        messageId: data.messageId 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}