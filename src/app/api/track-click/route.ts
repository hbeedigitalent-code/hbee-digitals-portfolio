import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaign')
  const email = request.nextUrl.searchParams.get('email')
  const url = request.nextUrl.searchParams.get('url')
  
  if (campaignId && email && url) {
    // Track click
    await supabase.from('newsletter_clicks').insert({
      campaign_id: campaignId,
      email: email,
      url: url,
      clicked_at: new Date().toISOString(),
    })
    
    // Update send record
    await supabase
      .from('newsletter_sends')
      .update({ clicked_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('email', email)
  }
  
  // Redirect to original URL
  return NextResponse.redirect(decodeURIComponent(url || 'https://www.hbeedigitals.com'))
}