import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source = 'website' } = body;

    console.log('📧 Received:', { email, name, source });

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Simple insert - let Supabase handle duplicates
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: emailLower,
        name: name || null,
        source: source,
        status: 'active',
        created_at: new Date().toISOString()
      });

    // If duplicate email, that's fine - just return success
    if (error && error.code === '23505') {
      console.log('📧 Email already exists:', emailLower);
      return NextResponse.json({ success: true, message: 'Already subscribed!' });
    }

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Subscribed:', emailLower);
    return NextResponse.json({ success: true, message: 'Subscribed successfully!' });
    
  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}