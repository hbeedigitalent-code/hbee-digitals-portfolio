import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// PUBLIC ROUTE — deliberately NOT admin-gated. Recipients follow the
// unsubscribe link from an email with no session, and that must keep working.
//
// SERVICE-ROLE KEY REQUIRED — NO ANON FALLBACK. The anon fallback is removed
// for the same reason as the tracking routes, but the consequence here is
// different and worse: this page previously rendered "You Have Been
// Unsubscribed" unconditionally, without checking whether the update succeeded.
// A failed write therefore told the recipient they were removed when they were
// not — the one outcome a compliance-sensitive flow must never produce.
//
// The update result is now inspected, and an explicit failure page is rendered
// if the unsubscribe did not persist.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    const campaignId = request.nextUrl.searchParams.get('campaign')

    if (!email) {
      return htmlResponse('Email Required', 'We could not process your unsubscribe request because no email address was provided.')
    }

    if (!supabase) {
      console.error(
        '[unsubscribe] SUPABASE_SERVICE_ROLE_KEY is not configured — cannot process ' +
          'the unsubscribe request. Reporting failure rather than claiming success.',
      )
      return htmlResponse(
        'Unsubscribe Temporarily Unavailable',
        'We could not process your request because of a server configuration problem. ' +
          'You have NOT been unsubscribed. Please email hello@hbeedigitals.com and we ' +
          'will remove you manually.',
      )
    }

    const cleanEmail = email.toLowerCase().trim()
    const now = new Date().toISOString()

    // The result IS inspected. A failure here must not render a success page.
    const { error: unsubscribeError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        updated_at: now,
      })
      .eq('email', cleanEmail)

    if (unsubscribeError) {
      console.error(
        `[unsubscribe] failed to unsubscribe a recipient: ${unsubscribeError.message}`,
      )
      return htmlResponse(
        'We Could Not Complete Your Request',
        'Something went wrong and you have NOT been unsubscribed. Please email ' +
          'hello@hbeedigitals.com and we will remove you manually.',
      )
    }

    // Best-effort telemetry. The unsubscribe itself has already persisted, so a
    // failure here is logged but must not tell the recipient it did not work.
    if (campaignId) {
      const { error: sendsError } = await supabase
        .from('newsletter_sends')
        .update({
          status: 'unsubscribed',
          unsubscribed_at: now,
        })
        .eq('campaign_id', campaignId)
        .eq('email', cleanEmail)

      if (sendsError) {
        console.error(
          `[unsubscribe] recipient was unsubscribed, but the newsletter_sends ` +
            `telemetry update failed for campaign ${campaignId}: ${sendsError.message}`,
        )
      }
    }

    return htmlResponse(
      'You Have Been Unsubscribed',
      'You have been removed from Hbee Digitals newsletter updates.'
    )
  } catch (error) {
    console.error('Unsubscribe error:', error)

    return htmlResponse(
      'Something Went Wrong',
      'We could not complete your unsubscribe request. Please try again or contact Hbee Digitals.'
    )
  }
}

function htmlResponse(title: string, message: string) {
  return new NextResponse(
    `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Hbee Digitals</title>
</head>
<body style="margin:0;background:#07111F;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
  <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <section style="max-width:560px;width:100%;background:#0E1B2D;border:1px solid rgba(255,255,255,0.10);border-radius:28px;padding:40px 28px;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.30);">
      <div style="width:64px;height:64px;margin:0 auto 20px;border-radius:999px;background:#39D97A;color:#07111F;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;">
        ✓
      </div>

      <h1 style="font-size:32px;line-height:1.1;margin:0 0 14px;font-weight:900;letter-spacing:-0.04em;">
        ${title}
      </h1>

      <p style="font-size:16px;line-height:1.7;color:#B8C7DE;margin:0 0 28px;">
        ${message}
      </p>

      <a href="https://www.hbeedigitals.com" style="display:inline-flex;align-items:center;justify-content:center;background:#39D97A;color:#07111F;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:14px;font-weight:900;">
        Return to Hbee Digitals
      </a>

      <p style="margin:28px 0 0;color:#70809A;font-size:12px;">
        Hbee Digitals · Digital Growth Studio
      </p>
    </section>
  </main>
</body>
</html>
    `,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}