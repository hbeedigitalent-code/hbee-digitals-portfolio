import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, name, source = 'website_footer' } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Check if already subscribed
    const { data: existing, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email)
      .single();

    if (existing) {
      if (existing.status === 'unsubscribed') {
        // Reactivate
        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({ 
            status: 'active', 
            updated_at: new Date().toISOString() 
          })
          .eq('email', email);
        
        if (updateError) throw updateError;
        return NextResponse.json({ message: 'Re-subscribed successfully!' });
      }
      return NextResponse.json({ message: 'Already subscribed!' });
    }

    // Add new subscriber
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert([{ 
        email, 
        name: name || null, 
        source, 
        status: 'active', 
        segment: 'lead',
        created_at: new Date().toISOString()
      }]);

    if (insertError) throw insertError;

    return NextResponse.json({ message: 'Subscribed successfully!' });
    
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}