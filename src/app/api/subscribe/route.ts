import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp, rateLimitMessage } from '@/lib/rate-limit'
import { turnstileFailureMessage, verifyTurnstileToken } from '@/lib/turnstile'
import { NEWSLETTER_CONSENT_VERSION, newsletterCaptureEnabled, normalizedEmail, readNewsletterSettings } from '@/lib/footer-settings'

const unavailable = () => NextResponse.json({ error: 'Subscription is temporarily unavailable. Please try again later.' }, { status: 503 })

/** One canonical flow; no email send and no anonymous access to subscriber records. */
export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: 'Please subscribe from this website.' }, { status: 403 })
    }
    const ip = getClientIp(request), limit = await checkRateLimit('newsletter', ip)
    // Elective newsletter capture must not bypass its quota during an Upstash
    // outage. The shared helper's fail-open contact/onboarding policy is unchanged.
    if (limit.degraded) return unavailable()
    if (!limit.ok) return NextResponse.json({ error: rateLimitMessage(limit.retryAfterSeconds) }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds || 60) } })
    if (!request.headers.get('content-type')?.includes('application/json') || Number(request.headers.get('content-length') || 0) > 8192) return NextResponse.json({ error: 'Invalid subscription request.' }, { status: 400 })
    const text = await request.text()
    if (text.length > 8192) return NextResponse.json({ error: 'Invalid subscription request.' }, { status: 400 })
    let body: Record<string, unknown>
    try { body = JSON.parse(text) } catch { return NextResponse.json({ error: 'Invalid subscription request.' }, { status: 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid subscription request.' }, { status: 400 })
    const email = normalizedEmail(body.email, true), source = body.source
    if (!email || (source !== 'footer' && source !== 'popup')) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    if (body.consent !== true || body.consent_version !== NEWSLETTER_CONSENT_VERSION) return NextResponse.json({ error: 'Please agree to receive Hbee Digitals insights and updates by email.' }, { status: 400 })
    const verification = await verifyTurnstileToken(body.turnstile_token, ip)
    if (!verification.ok) return NextResponse.json({ error: turnstileFailureMessage(verification.reason) }, { status: verification.reason === 'not-configured' ? 503 : 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return unavailable()
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) } })
    const settings = await db.from('site_settings').select('newsletter_settings').eq('settings_key', 'site').maybeSingle()
    if (settings.error || !settings.data) return unavailable()
    const config = readNewsletterSettings(settings.data.newsletter_settings)
    if (!newsletterCaptureEnabled(config, source)) return unavailable()
    const { data, error } = await db.from('newsletter_subscribers').insert({
      email, name: null, source, status: 'active', created_at: new Date().toISOString(),
      consent_given_at: new Date().toISOString(), consent_source: source, consent_version: NEWSLETTER_CONSENT_VERSION,
    }).select('id').single()
    if (error?.code === '23505') {
      // The normalized constraint may match an untouched historical mixed-case
      // or space-padded email. An exact email filter would miss that record.
      const stored = await db.rpc('newsletter_subscriber_identity', { p_email: email }).returns<Array<{ id: string; status: string | null }>>().maybeSingle()
      if (!stored.error && stored.data?.id && stored.data.status === 'active') return NextResponse.json({ success: true, already_subscribed: true, message: 'You are already subscribed.' })
      // Never reactivate an opt-out or fabricate success for an unrelated constraint error.
      return NextResponse.json({ error: 'We could not subscribe this address. Please contact us for help.' }, { status: 409 })
    }
    if (error || !data?.id) return unavailable()
    return NextResponse.json({ success: true, already_subscribed: false, message: 'Thanks for subscribing. You can unsubscribe at any time.' })
  } catch {
    return unavailable()
  }
}
