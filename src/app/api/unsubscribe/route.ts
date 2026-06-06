import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  
  if (!email) {
    return new NextResponse('Email required', { status: 400 })
  }

  await supabase
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed' })
    .eq('email', email)

  // Return a simple confirmation message
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
      <head><title>Unsubscribed | Hbee Digitals</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #0A1D37;">✓ Unsubscribed</h1>
        <p>You have been removed from Hbee Digitals newsletter.</p>
        <a href="https://www.hbeedigitals.com" style="color: #39D97A;">Return to Hbee Digitals</a>
      </body>
    </html>
  `, { 
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  })
}