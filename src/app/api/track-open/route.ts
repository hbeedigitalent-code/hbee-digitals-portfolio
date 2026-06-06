import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaign')
  const email = request.nextUrl.searchParams.get('email')
  
  if (campaignId && email) {
    // Update open tracking
    await supabase
      .from('newsletter_sends')
      .update({ opened_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('email', email)
    
    // Update campaign total opens
    await supabase.rpc('increment_campaign_opens', { campaign_id: campaignId })
  }
  
  // Return 1x1 pixel
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}