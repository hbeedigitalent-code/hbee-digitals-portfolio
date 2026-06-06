import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, source = 'website_footer' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Reactivate
        await supabase
          .from('newsletter_subscribers')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('email', email);
        return NextResponse.json({ message: 'Re-subscribed successfully!' });
      }
      return NextResponse.json({ message: 'Already subscribed!' });
    }

    // Add new subscriber
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email, name, source, status: 'active', segment: 'lead' }]);

    if (error) throw error;

    return NextResponse.json({ message: 'Subscribed successfully!' });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}