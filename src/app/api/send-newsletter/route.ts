// src/app/api/send-newsletter/route.ts
//
// POST — send a newsletter campaign to its audience.
//
// AUTHORIZATION. This route previously had NONE: any unauthenticated caller who
// knew (or guessed) a campaign UUID could trigger a real send to every active
// subscriber. It now uses requireActiveAdmin(), the single admin gate shared by
// the other /api/admin/* routes, which enforces in order:
//   1. a valid Supabase session            -> 401 (generic)
//   2. a user-bound admin 2FA cookie       -> 401 (the SAME generic message,
//                                              checked BEFORE any privileged
//                                              lookup)
//   3. a service-role client being available -> 500
//   4. an active admin_users row           -> 403
// The gate runs FIRST — before the body is parsed, before any campaign or
// subscriber read, before any Resend call and before any database mutation.
//
// SERVICE-ROLE KEY IS REQUIRED, NOT OPTIONAL. The anon-key fallback that used to
// back this client is gone. requireActiveAdmin() returns the privileged client
// or a 500; it never substitutes the public anon key on a server route.

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireActiveAdmin } from '@/lib/admin-api-auth'

const resendApiKey = process.env.RESEND_API_KEY
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'

const resend = resendApiKey ? new Resend(resendApiKey) : null

/** The only audience values this route will act on. Anything else is rejected. */
const SUPPORTED_AUDIENCES = [
  'all_subscribers',
  'all_leads',
  'existing_clients',
  'shopify_leads',
  'ecommerce_merchants',
] as const

type SupportedAudience = (typeof SUPPORTED_AUDIENCES)[number]

export async function POST(request: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. AUTHORIZATION — before anything else.
    // ------------------------------------------------------------------
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const { db: supabase } = auth

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

    // FAIL CLOSED ON EMPTY CONTENT.
    //
    // The body is read from `content`, the real NOT NULL column. This used to
    // read a non-existent `content_html` and fall back to '' further down, so a
    // schema drift or a bad row would have sent every subscriber a branded
    // email with an empty body — silently, and counted as a success.
    //
    // The column is NOT NULL, so an empty body here means something is wrong
    // upstream. Refusing costs one failed send; proceeding costs the whole
    // list. The campaign is returned to 'draft' so it is not stranded in
    // 'sending', matching how the no-subscribers branch below behaves.
    const campaignContent =
      typeof campaign.content === 'string' ? campaign.content.trim() : ''

    if (!campaignContent) {
      console.error(
        `[send-newsletter] campaign ${campaignId} has empty content — refusing to send`,
      )

      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'draft' })
        .eq('id', campaignId)

      return NextResponse.json(
        { error: 'This campaign has no content. Nothing was sent.' },
        { status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // AUDIENCE SELECTION — FAILS CLOSED.
    //
    // This was four independent `if` statements with no else and no default. An
    // audience_type that matched none of them — NULL, blank, a typo, or a value
    // added to the enum later — left the query as a bare status='active', which
    // means EVERY ACTIVE SUBSCRIBER. A mistake failed open, to the whole list.
    //
    // Unrecognised values are now rejected with a 400 before the subscriber
    // query runs, so a typo can never become "send to everyone".
    // 'all_subscribers' remains the one value that deliberately adds no filter.
    // ------------------------------------------------------------------
    const audienceType = campaign.audience_type

    if (
      typeof audienceType !== 'string' ||
      !SUPPORTED_AUDIENCES.includes(audienceType as SupportedAudience)
    ) {
      console.error(
        `[send-newsletter] campaign ${campaignId} has unsupported audience_type ` +
          `${JSON.stringify(audienceType)} — refusing to send`,
      )

      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'draft' })
        .eq('id', campaignId)

      return NextResponse.json(
        {
          error:
            'This campaign has an unrecognised audience. Nothing was sent. ' +
            'Choose a supported audience and try again.',
        },
        { status: 400 },
      )
    }

    let subscribersQuery = supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('status', 'active')

    switch (audienceType as SupportedAudience) {
      case 'all_subscribers':
        // Intentionally unfiltered beyond status='active'.
        break
      case 'all_leads':
        subscribersQuery = subscribersQuery.eq('segment', 'lead')
        break
      case 'existing_clients':
        subscribersQuery = subscribersQuery.eq('segment', 'client')
        break
      case 'shopify_leads':
        subscribersQuery = subscribersQuery.contains('tags', ['shopify'])
        break
      case 'ecommerce_merchants':
        subscribersQuery = subscribersQuery.contains('tags', ['ecommerce'])
        break
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
    /** newsletter_sends rows that could not be written. Telemetry only. */
    let loggingFailures = 0

    for (const subscriber of subscribers) {
      const email = subscriber.email

      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}`
      const openUrl = `${siteUrl}/api/track-open?campaign=${campaignId}&email=${encodeURIComponent(email)}`
      const clickUrl = `${siteUrl}/api/track-click?campaign=${campaignId}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(campaign.cta_url || siteUrl)}`

      const html = buildEmailHtml({
        campaign,
        content: campaignContent,
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

        // DELIVERY OUTCOME AND LOGGING OUTCOME ARE KEPT SEPARATE.
        //
        // The email is already accepted by Resend at this point. If the
        // telemetry insert fails, the send still counts as a success: treating
        // a delivered email as failed would invite a duplicate resend to a real
        // subscriber. The logging failure is counted and logged instead.
        //
        // Subscriber IDs are logged, never email addresses.
        const { error: logError } = await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })

        if (logError) {
          loggingFailures++
          console.error(
            `[send-newsletter] campaign ${campaignId}: email ACCEPTED for subscriber ` +
              `${subscriber.id} but newsletter_sends insert failed (${logError.message}). ` +
              `Delivery stands; telemetry for this recipient is missing.`,
          )
        }

        successCount++
      } catch (error: any) {
        const { error: logError } = await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_id: subscriber.id,
          email,
          status: 'failed',
          error_message: error?.message || 'Unknown send error',
          sent_at: new Date().toISOString(),
        })

        if (logError) {
          loggingFailures++
          console.error(
            `[send-newsletter] campaign ${campaignId}: send FAILED for subscriber ` +
              `${subscriber.id} and the newsletter_sends failure insert also failed ` +
              `(${logError.message}).`,
          )
        }

        failCount++
      }
    }

    // ------------------------------------------------------------------
    // ZERO-SUCCESS CAMPAIGNS ARE NOT 'sent'.
    //
    // This used to mark the campaign 'sent' with a sent_at timestamp even when
    // every single delivery failed, leaving a campaign that looks dispatched,
    // reports 0 recipients, and cannot be distinguished from a real send.
    //
    // No new status value is introduced: the campaign goes back to 'draft',
    // exactly as the no-content and no-subscriber branches above do, so it can
    // be corrected and retried. sent_at is deliberately NOT written.
    // ------------------------------------------------------------------
    if (successCount === 0) {
      console.error(
        `[send-newsletter] campaign ${campaignId}: 0 of ${subscribers.length} ` +
          `deliveries accepted (${failCount} failed, ${loggingFailures} telemetry ` +
          `write failures) — returning campaign to draft`,
      )

      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'draft', total_recipients: 0 })
        .eq('id', campaignId)

      return NextResponse.json(
        {
          error:
            'No emails could be delivered. The campaign was returned to draft ' +
            'and has not been marked as sent.',
          sent: 0,
          failed: failCount,
          loggingFailures,
        },
        { status: 502 },
      )
    }

    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: successCount,
      })
      .eq('id', campaignId)

    if (loggingFailures > 0) {
      console.error(
        `[send-newsletter] campaign ${campaignId}: ${loggingFailures} newsletter_sends ` +
          `rows could not be written. Open/click tracking will be incomplete for ` +
          `those recipients; delivery itself was unaffected.`,
      )
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      // Aggregate only — never a subscriber address.
      loggingFailures,
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
  // Passed in rather than read off `campaign` so the body reaching the inbox is
  // the same validated, non-empty string the caller checked. This function
  // cannot silently fall back to an empty body.
  content,
  openUrl,
  clickUrl,
  unsubscribeUrl,
}: {
  campaign: any
  content: string
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
          ${content}
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