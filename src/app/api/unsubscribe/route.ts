import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyNewsletterUnsubscribeIdentity } from '@/lib/newsletter-unsubscribe.server'

const MAX_BODY = 8_192
const noStore = { 'Cache-Control': 'no-store' }

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: noStore })
}

/**
 * Legacy links may already target this GET endpoint. Redirect them without
 * preserving an unsigned email and, critically, without touching the database.
 * A signed query is preserved only so an accidentally retained signed API URL
 * can still reach the reviewed confirmation page.
 */
export async function GET(request: Request) {
  const source = new URL(request.url)
  const destination = new URL('/unsubscribe', source.origin)
  const email = source.searchParams.get('email')
  const signature = source.searchParams.get('signature')
  if (email && signature) {
    destination.searchParams.set('email', email)
    destination.searchParams.set('signature', signature)
  } else {
    destination.searchParams.set('reason', 'legacy')
  }
  return new NextResponse(null, { status: 303, headers: { ...noStore, Location: destination.toString() } })
}

/** Deliberate, signed, server-side unsubscribe mutation. */
export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    if (request.headers.get('origin') !== requestUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return json({ error: 'Use the unsubscribe page supplied in your email.', state: 'invalid_link' }, 403)
    }
    if (!request.headers.get('content-type')?.includes('application/json') || Number(request.headers.get('content-length') || 0) > MAX_BODY) {
      return json({ error: 'This unsubscribe request is not valid.', state: 'invalid_link' }, 400)
    }
    const text = await request.text()
    if (text.length > MAX_BODY) return json({ error: 'This unsubscribe request is not valid.', state: 'invalid_link' }, 400)
    let body: Record<string, unknown>
    try { body = JSON.parse(text) } catch { return json({ error: 'This unsubscribe request is not valid.', state: 'invalid_link' }, 400) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'This unsubscribe request is not valid.', state: 'invalid_link' }, 400)

    let email: string | null
    try { email = verifyNewsletterUnsubscribeIdentity(body.email, body.signature) }
    catch { return json({ error: 'Unsubscribe is temporarily unavailable. Please try again.', state: 'server_failure' }, 503) }
    if (!email) return json({ error: 'This unsubscribe link is not valid.', state: 'invalid_link' }, 400)

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return json({ error: 'Unsubscribe is temporarily unavailable. Please try again.', state: 'server_failure' }, 503)
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    })

    const identity = await db.rpc('newsletter_subscriber_identity', { p_email: email })
      .returns<Array<{ id: string; status: string | null }>>()
      .maybeSingle()
    if (identity.error) return json({ error: 'We could not update your subscription. Please try again.', state: 'server_failure' }, 503)
    if (!identity.data?.id) return json({ error: 'We could not find this subscription.', state: 'not_found' }, 404)
    if (identity.data.status === 'unsubscribed') {
      return json({ success: true, state: 'already_unsubscribed' }, 200)
    }

    const result = await db.from('newsletter_subscribers')
      .update({ status: 'unsubscribed' })
      .eq('id', identity.data.id)
      .select('id')
      .maybeSingle()
    if (result.error) return json({ error: 'We could not update your subscription. Please try again.', state: 'server_failure' }, 503)
    if (!result.data?.id) return json({ error: 'We could not find this subscription.', state: 'not_found' }, 404)
    return json({ success: true, state: 'unsubscribed' }, 200)
  } catch {
    return json({ error: 'Unsubscribe is temporarily unavailable. Please try again.', state: 'server_failure' }, 500)
  }
}
