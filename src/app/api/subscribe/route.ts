import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, source = 'website_footer' } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Try to insert or update
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { 
          email: email.toLowerCase().trim(), 
          name: name || null, 
          source, 
          status: 'active',
          segment: 'lead',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'email' }
      )
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully subscribed!' 
    });
    
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}