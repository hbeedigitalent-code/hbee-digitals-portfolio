import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const defaultRedirect = 'https://www.hbeedigitals.com'

export async function GET(request: NextRequest) {
  try {
    const campaignId = request.nextUrl.searchParams.get('campaign')
    const email = request.nextUrl.searchParams.get('email')
    const url = request.nextUrl.searchParams.get('url')

    const redirectUrl = safeRedirectUrl(url)

    if (supabase && campaignId && email && redirectUrl) {
      const now = new Date().toISOString()
      const cleanEmail = email.toLowerCase().trim()

      await supabase.from('newsletter_clicks').insert({
        campaign_id: campaignId,
        email: cleanEmail,
        url: redirectUrl,
        clicked_at: now,
      })

      const { data: existingSend } = await supabase
        .from('newsletter_sends')
        .select('clicked_at')
        .eq('campaign_id', campaignId)
        .eq('email', cleanEmail)
        .maybeSingle()

      await supabase
        .from('newsletter_sends')
        .update({
          clicked_at: existingSend?.clicked_at || now,
          status: 'clicked',
        })
        .eq('campaign_id', campaignId)
        .eq('email', cleanEmail)

      if (!existingSend?.clicked_at) {
        const { data: campaign } = await supabase
          .from('newsletter_campaigns')
          .select('total_clicks')
          .eq('id', campaignId)
          .single()

        await supabase
          .from('newsletter_campaigns')
          .update({
            total_clicks: Number(campaign?.total_clicks || 0) + 1,
          })
          .eq('id', campaignId)
      }
    }

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Track click error:', error)
    return NextResponse.redirect(defaultRedirect)
  }
}

function safeRedirectUrl(url: string | null) {
  if (!url) return defaultRedirect

  try {
    const decoded = decodeURIComponent(url)
    const parsed = new URL(decoded)

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return defaultRedirect
    }

    return parsed.toString()
  } catch {
    return defaultRedirect
  }
}