import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, source = 'website_footer' } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const emailLower = email.toLowerCase().trim();

    console.log('Attempting to subscribe:', { email: emailLower, name, source });

    // Try to insert
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: emailLower,
        name: name || null,
        source: source,
        status: 'active',
        segment: 'lead',
        created_at: now,
        updated_at: now
      })
      .select();

    // If duplicate email, update instead
    if (error && error.code === '23505') {
      console.log('Email exists, updating status to active');
      const { data: updateData, error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({ 
          status: 'active', 
          updated_at: now,
          name: name || null
        })
        .eq('email', emailLower)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Successfully re-subscribed!' 
      });
    }

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Subscription successful:', data);
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully subscribed!' 
    });
    
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}