import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// SERVICE-ROLE KEY REQUIRED — NO ANON FALLBACK.
//
// This used to fall back to NEXT_PUBLIC_SUPABASE_ANON_KEY. After
// remediation-03a, anon holds no privilege at all on newsletter_sends or
// newsletter_clicks, so that fallback would not degrade gracefully — every read
// and write would return nothing while the route still answered 200, and open
// tracking would stop with no error anywhere.
//
// The key is now required. When it is absent the misconfiguration is logged at
// error level and the recipient still receives a normal tracking pixel, so
// emails never show a broken image. No database call is attempted.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null

const transparentPixel = Buffer.from(
  'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
)

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      // Loud about the cause, silent to the recipient: the pixel still renders.
      console.error(
        '[track-open] SUPABASE_SERVICE_ROLE_KEY is not configured — open tracking ' +
          'is DISABLED. Returning the pixel without recording anything.',
      )
      return pixelResponse()
    }

    const campaignId = request.nextUrl.searchParams.get('campaign')
    const email = request.nextUrl.searchParams.get('email')

    if (campaignId && email) {
      const now = new Date().toISOString()
      const cleanEmail = email.toLowerCase().trim()

      const { data: existingSend } = await supabase
        .from('newsletter_sends')
        .select('opened_at')
        .eq('campaign_id', campaignId)
        .eq('email', cleanEmail)
        .maybeSingle()

      await supabase
        .from('newsletter_sends')
        .update({
          opened_at: existingSend?.opened_at || now,
          status: 'opened',
        })
        .eq('campaign_id', campaignId)
        .eq('email', cleanEmail)

      if (!existingSend?.opened_at) {
        const { data: campaign } = await supabase
          .from('newsletter_campaigns')
          .select('total_opens')
          .eq('id', campaignId)
          .single()

        await supabase
          .from('newsletter_campaigns')
          .update({
            total_opens: Number(campaign?.total_opens || 0) + 1,
          })
          .eq('id', campaignId)
      }
    }

    return pixelResponse()
  } catch (error) {
    console.error('Track open error:', error)
    return pixelResponse()
  }
}

function pixelResponse() {
  return new Response(transparentPixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': transparentPixel.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}