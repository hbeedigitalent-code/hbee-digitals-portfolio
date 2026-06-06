import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const resendApiKey = process.env.RESEND_API_KEY
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 })
    }

    if (!resend) {
      return NextResponse.json({ error: 'RESEND_API_KEY is missing.' }, { status: 500 })
    }

    const { campaignId } = await request.json()

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required.' }, { status: 400 })
    }

    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })
    }

    let subscribersQuery = supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('status', 'active')

    if (campaign.audience_type === 'all_leads') {
      subscribersQuery = subscribersQuery.eq('segment', 'lead')
    }

    if (campaign.audience_type === 'existing_clients') {
      subscribersQuery = subscribersQuery.eq('segment', 'client')
    }

    if (campaign.audience_type === 'shopify_leads') {
      subscribersQuery = subscribersQuery.contains('tags', ['shopify'])
    }

    if (campaign.audience_type === 'ecommerce_merchants') {
      subscribersQuery = subscribersQuery.contains('tags', ['ecommerce'])
    }

    const { data: subscribers, error: subscribersError } = await subscribersQuery

    if (subscribersError || !subscribers || subscribers.length === 0) {
      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'draft' })
        .eq('id', campaignId)

      return NextResponse.json(
        { error: 'No active subscribers found for this audience.' },
        { status: 400 }
      )
    }

    let successCount = 0
    let failCount = 0

    for (const subscriber of subscribers) {
      const email = subscriber.email

      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}`
      const openUrl = `${siteUrl}/api/track-open?campaign=${campaignId}&email=${encodeURIComponent(email)}`
      const clickUrl = `${siteUrl}/api/track-click?campaign=${campaignId}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(campaign.cta_url || siteUrl)}`

      const html = buildEmailHtml({
        campaign,
        openUrl,
        clickUrl,
        unsubscribeUrl,
      })

      try {
        await resend.emails.send({
          from: `${campaign.sender_name || 'Hbee Digitals'} <${process.env.RESEND_FROM_EMAIL || campaign.sender_email || 'forms@send.hbeedigitals.com'}>`,
          to: email,
          subject: campaign.subject,
          html,
          text: campaign.preview_text || campaign.subject,
          replyTo:
            campaign.reply_to_email ||
            process.env.RESEND_REPLY_TO_EMAIL ||
            'habeeb@hbeedigitals.com',
        })

        await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })

        successCount++
      } catch (error: any) {
        await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email,
          status: 'failed',
          error_message: error?.message || 'Unknown send error',
          sent_at: new Date().toISOString(),
        })

        failCount++
      }
    }

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
      message: `Campaign sent to ${successCount} contacts. ${failCount} failed.`,
    })
  } catch (error: any) {
    console.error('Send newsletter error:', error)

    return NextResponse.json(
      { error: error?.message || 'Failed to send newsletter.' },
      { status: 500 }
    )
  }
}

function buildEmailHtml({
  campaign,
  openUrl,
  clickUrl,
  unsubscribeUrl,
}: {
  campaign: any
  openUrl: string
  clickUrl: string
  unsubscribeUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(campaign.subject)}</title>
</head>

<body style="margin:0;padding:0;background:#F5F7FA;font-family:Arial,Helvetica,sans-serif;">
  <img src="${openUrl}" width="1" height="1" style="display:none;" alt="" />

  <div style="width:100%;background:#F5F7FA;padding:24px 12px;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 35px rgba(10,29,55,0.10);">
      
      <div style="background:#0A1D37;padding:34px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.03em;">
          Hbee Digitals
        </h1>
        <p style="margin:6px 0 0;color:#39D97A;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
          Digital Growth Studio
        </p>
      </div>

      <div style="padding:38px 28px;background:#ffffff;">
        <div style="display:inline-block;background:#39D97A;color:#07111F;border-radius:999px;padding:7px 14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:20px;">
          ${escapeHtml(campaign.campaign_type || 'Growth Insight')}
        </div>

        ${
          campaign.featured_image
            ? `<img src="${campaign.featured_image}" alt="${escapeHtml(campaign.subject)}" style="width:100%;border-radius:18px;margin-bottom:24px;display:block;" />`
            : ''
        }

        <h2 style="margin:0 0 18px;color:#0A1D37;font-size:30px;line-height:1.18;font-weight:900;letter-spacing:-0.04em;">
          ${escapeHtml(campaign.subject)}
        </h2>

        ${
          campaign.preview_text
            ? `<p style="margin:0 0 24px;color:#6B7A96;font-size:15px;line-height:1.7;">${escapeHtml(campaign.preview_text)}</p>`
            : ''
        }

        <div style="color:#3A4A62;font-size:16px;line-height:1.75;">
          ${campaign.content_html || ''}
        </div>

        <div style="text-align:center;margin:34px 0 8px;">
          <a href="${clickUrl}" style="display:inline-block;background:#39D97A;color:#07111F;text-decoration:none;border-radius:999px;padding:15px 32px;font-size:14px;font-weight:900;">
            ${escapeHtml(campaign.cta_text || 'Read More')}
          </a>
        </div>
      </div>

      <div style="background:#F5F7FA;padding:26px 22px;text-align:center;border-top:1px solid #E4EAF5;">
        <p style="margin:0 0 8px;color:#6B7A96;font-size:12px;line-height:1.6;">
          ${escapeHtml(campaign.footer_note || 'Helping businesses build stronger digital systems for measurable growth.')}
        </p>

        <p style="margin:0 0 14px;color:#0A1D37;font-size:12px;font-weight:700;">
          Hbee Digitals · www.hbeedigitals.com
        </p>

        <p style="margin:0;color:#6B7A96;font-size:11px;">
          <a href="${unsubscribeUrl}" style="color:#39D97A;text-decoration:none;font-weight:700;">Unsubscribe</a>
          &nbsp;|&nbsp;
          <a href="${siteUrl}/privacy" style="color:#39D97A;text-decoration:none;font-weight:700;">Privacy Policy</a>
          &nbsp;|&nbsp;
          <a href="${siteUrl}/contact" style="color:#39D97A;text-decoration:none;font-weight:700;">Contact</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

function escapeHtml(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}