import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Only import Resend if API key exists (prevents build error)
let Resend: any
let resend: any

// Check if API key exists before initializing Resend
if (process.env.RESEND_API_KEY) {
  try {
    const ResendModule = require('resend')
    Resend = ResendModule.Resend
    resend = new Resend(process.env.RESEND_API_KEY)
  } catch (error) {
    console.warn('Resend module not available during build')
  }
}

export async function POST(request: NextRequest) {
  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ 
      error: 'Resend API key not configured. Please add RESEND_API_KEY to your environment variables.' 
    }, { status: 500 })
  }

  if (!resend) {
    return NextResponse.json({ 
      error: 'Email service not initialized. Please check your Resend API key.' 
    }, { status: 500 })
  }

  try {
    const { campaignId } = await request.json()

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get subscribers based on audience type
    let query = supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('status', 'active')

    // Apply audience filters
    if (campaign.audience_type === 'ecommerce_merchants') {
      query = query.contains('tags', ['ecommerce'])
    } else if (campaign.audience_type === 'shopify_leads') {
      query = query.contains('tags', ['shopify'])
    } else if (campaign.audience_type === 'warm_leads') {
      query = query.contains('tags', ['warm'])
    } else if (campaign.audience_type === 'cold_leads') {
      query = query.contains('tags', ['cold'])
    } else if (campaign.audience_type === 'existing_clients') {
      query = query.eq('segment', 'client')
    } else if (campaign.audience_type === 'all_leads') {
      query = query.eq('segment', 'lead')
    }

    const { data: subscribers, error: subscribersError } = await query

    if (subscribersError || !subscribers || subscribers.length === 0) {
      return NextResponse.json({ error: 'No active subscribers found for this audience' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'
    
    let successCount = 0
    let failCount = 0
    const failedEmails: string[] = []

    // Send emails to each subscriber
    for (const subscriber of subscribers) {
      // Generate unique unsubscribe URL for this subscriber
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(subscriber.email)}&token=${Buffer.from(subscriber.email).toString('base64')}`
      
      // Track open and click tracking URLs
      const trackOpenUrl = `${baseUrl}/api/track-open?campaign=${campaignId}&email=${encodeURIComponent(subscriber.email)}`
      const trackClickUrl = (url: string) => `${baseUrl}/api/track-click?campaign=${campaignId}&email=${encodeURIComponent(subscriber.email)}&url=${encodeURIComponent(url)}`

      // Build the email HTML with Hbee Digitals branding
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${campaign.subject}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #F5F7FA; }
            .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; }
            .header { background: #0A1D37; padding: 30px 20px; text-align: center; }
            .logo { color: #FFFFFF; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
            .tagline { color: #39D97A; font-size: 12px; font-weight: 700; margin: 5px 0 0; text-transform: uppercase; letter-spacing: 0.08em; }
            .content { padding: 40px 30px; background: #FFFFFF; }
            .category-badge { display: inline-block; background: #39D97A; color: #0A1D37; font-size: 10px; font-weight: 900; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.08em; }
            .featured-image { width: 100%; border-radius: 16px; margin-bottom: 24px; }
            .subject { color: #0A1D37; font-size: 28px; font-weight: 800; line-height: 1.2; margin: 0 0 16px; letter-spacing: -0.02em; }
            .body-text { color: #3A4A62; font-size: 16px; line-height: 1.6; margin: 0; }
            .body-text p { margin: 0 0 20px; }
            .body-text h2 { color: #0A1D37; font-size: 22px; font-weight: 700; margin: 30px 0 15px; }
            .body-text h3 { color: #0A1D37; font-size: 18px; font-weight: 600; margin: 20px 0 10px; }
            .body-text ul, .body-text ol { margin: 0 0 20px; padding-left: 20px; }
            .body-text li { margin: 8px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #39D97A 100%); color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 800; font-size: 14px; margin: 32px 0; text-align: center; transition: transform 0.2s; }
            .cta-button:hover { transform: scale(1.02); }
            .footer { background: #F5F7FA; padding: 30px 20px; text-align: center; font-size: 12px; color: #6B7A96; border-top: 1px solid #E4EAF5; }
            .footer a { color: #39D97A; text-decoration: none; font-weight: 600; }
            .footer-links { margin: 16px 0 0; }
            .footer-links a { margin: 0 10px; }
            @media only screen and (max-width: 480px) {
              .content { padding: 30px 20px; }
              .subject { font-size: 24px; }
              .cta-button { display: block; text-align: center; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 20px 0; background-color: #F5F7FA;">
          <!-- Tracking pixel for opens -->
          <img src="${trackOpenUrl}" width="1" height="1" style="display: none;" />
          
          <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 16px rgba(10, 29, 55, 0.08);">
            <!-- Header with Hbee Digitals Branding -->
            <div class="header" style="background: #0A1D37; padding: 30px 20px; text-align: center;">
              <h1 class="logo" style="color: #FFFFFF; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -0.02em;">Hbee Digitals</h1>
              <p class="tagline" style="color: #39D97A; font-size: 12px; font-weight: 700; margin: 5px 0 0; text-transform: uppercase; letter-spacing: 0.08em;">Digital Growth Studio</p>
            </div>
            
            <!-- Main Content -->
            <div class="content" style="padding: 40px 30px; background: #FFFFFF;">
              <!-- Campaign Category Badge -->
              <div class="category-badge" style="display: inline-block; background: #39D97A; color: #0A1D37; font-size: 10px; font-weight: 900; padding: 4px 12px; border-radius: 20px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.08em;">
                ${campaign.campaign_type || 'Growth Insight'}
              </div>
              
              <!-- Featured Image -->
              ${campaign.featured_image ? `<img src="${campaign.featured_image}" class="featured-image" style="width: 100%; border-radius: 16px; margin-bottom: 24px;" alt="${campaign.subject}" />` : ''}
              
              <!-- Subject Line -->
              <h2 class="subject" style="color: #0A1D37; font-size: 28px; font-weight: 800; line-height: 1.2; margin: 0 0 16px; letter-spacing: -0.02em;">${campaign.subject}</h2>
              
              <!-- Email Body Content -->
              <div class="body-text" style="color: #3A4A62; font-size: 16px; line-height: 1.6; margin: 0;">
                ${campaign.content_html || '<p>Thank you for being part of the Hbee Digitals community. We share practical insights to help you build better digital systems, stronger customer trust, and sustainable growth.</p>'}
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center;">
                <a href="${trackClickUrl(campaign.cta_url)}" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #39D97A 100%); color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 800; font-size: 14px; margin: 32px 0; text-align: center;">
                  ${campaign.cta_text || 'Read More'}
                </a>
              </div>
            </div>
            
            <!-- Footer with Unsubscribe Link -->
            <div class="footer" style="background: #F5F7FA; padding: 30px 20px; text-align: center; font-size: 12px; color: #6B7A96; border-top: 1px solid #E4EAF5;">
              <p style="margin: 0 0 8px;">© 2026 Hbee Digitals. All rights reserved.</p>
              <p style="margin: 0 0 16px;">${campaign.footer_note || 'Practical insights for better websites, stores, and growth.'}</p>
              <div class="footer-links" style="margin: 16px 0 0;">
                <a href="${unsubscribeUrl}" style="color: #39D97A; text-decoration: none; font-weight: 600; margin: 0 10px;">Unsubscribe</a>
                <a href="${baseUrl}/privacy" style="color: #39D97A; text-decoration: none; font-weight: 600; margin: 0 10px;">Privacy Policy</a>
                <a href="${baseUrl}/contact" style="color: #39D97A; text-decoration: none; font-weight: 600; margin: 0 10px;">Contact</a>
              </div>
              <p style="margin: 16px 0 0; font-size: 10px;">Hbee Digitals · Digital Growth Studio · helping brands build stronger digital systems</p>
            </div>
          </div>
        </body>
        </html>
      `

      try {
        // Send email via Resend with your configured emails
        await resend.emails.send({
          from: `Hbee Digitals <${process.env.RESEND_FROM_EMAIL || 'forms@send.hbeedigitals.com'}>`,
          to: [subscriber.email],
          subject: campaign.subject,
          html: emailHtml,
          replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'hello@hbeedigitals.com',
        })
        
        // Track successful send
        await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        
        successCount++
      } catch (error: any) {
        failCount++
        failedEmails.push(subscriber.email)
        
        // Track failed send
        await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email: subscriber.email,
          status: 'failed',
          error_message: error.message,
          sent_at: new Date().toISOString(),
        })
      }
    }

    // Update campaign stats
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: successCount,
      })
      .eq('id', campaignId)

    return NextResponse.json({ 
      success: true, 
      sent: successCount, 
      failed: failCount,
      failedEmails: failedEmails,
      message: `Campaign sent to ${successCount} subscribers. ${failCount} failed.`
    })
    
  } catch (error: any) {
    console.error('Newsletter sending error:', error)
    return NextResponse.json({ 
      error: 'Failed to send newsletter', 
      details: error.message 
    }, { status: 500 })
  }
}