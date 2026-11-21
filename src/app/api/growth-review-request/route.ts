// src/app/api/growth-review-request/route.ts
//
// PUBLIC endpoint for the short "Free Growth Review" campaign form: store URL,
// email, biggest challenge. It captures a LEAD. It deliberately does NOT touch
// the Growth Assessment system: no HGRI scoring, no merchant row, no
// growth_assessments / growth_reviews / Growth Profile, no portal invitation.
// The full assessment stays at POST /api/growth-assessment, unchanged.
//
// The lead is stored in the existing contact_submissions table, with the same
// column values /api/contact already writes (form_type 'contact', source
// 'website_contact_form', status 'new'), so the Admin inbox and its counters
// need no change to keep working. `service` marks the row as a campaign lead.
//
// ORDER OF CHECKS (cheapest rejection first), as in /api/contact:
//   1. rate limit  2. honeypot  3. Turnstile  4. validation
//   5. duplicate check  6. insert  7. best-effort email
// A failed check costs nothing beyond the check: no row, no email.
//
// Emails are best-effort. Once the row exists, nothing below may fail the
// request or ask the visitor to resubmit.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTurnstileToken, turnstileFailureMessage } from '@/lib/turnstile'
import { checkRateLimit, getClientIp, rateLimitMessage } from '@/lib/rate-limit'
import {
  GROWTH_REQUEST_SERVICE,
  buildStoredMessage,
  comparableStoreKey,
  storeHostname,
  validateGrowthRequestPayload,
} from '@/lib/validators/growth-request-payload'
import { sendGrowthRequestAcknowledgementEmail } from '@/lib/emails/growth-review-request-acknowledgement'
import { sendAdminContactNotification } from '@/lib/emails/admin-contact-notification'

/** Honeypot field name. Never shown to a visitor; a real browser leaves it empty. */
const HONEYPOT_FIELD = 'hb_extra'
const DUPLICATE_WINDOW_MS = 10 * 60_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[growth-request] Supabase environment variables are not set')
      return NextResponse.json({ error: 'Something went wrong on our side. Please try again shortly.' }, { status: 500 })
    }

    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const body = rawBody as Record<string, unknown>

    // 1. Rate limit.
    const clientIp = getClientIp(req)
    const limit = await checkRateLimit('growth_request', clientIp)
    if (!limit.ok) {
      return NextResponse.json(
        { error: rateLimitMessage(limit.retryAfterSeconds) },
        { status: 429, headers: limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : undefined },
      )
    }

    // 2. Honeypot. A filled trap gets the same success answer a real visitor
    //    gets, so a bot learns nothing — and costs nothing: no row, no email.
    const trap = body[HONEYPOT_FIELD]
    if (typeof trap === 'string' && trap.trim() !== '') {
      return NextResponse.json({ success: true, duplicate: false })
    }

    // 3. Turnstile.
    const turnstile = await verifyTurnstileToken(body.turnstile_token, clientIp)
    if (!turnstile.ok) {
      return NextResponse.json(
        {
          error: turnstileFailureMessage(turnstile.reason),
          retryable: turnstile.reason === 'expired' || turnstile.reason === 'unreachable',
        },
        { status: turnstile.reason === 'not-configured' ? 500 : 400 },
      )
    }

    // 4. Validation — rebuilt from an allow-list.
    const validation = validateGrowthRequestPayload(body)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const lead = validation.value

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 5. Duplicate protection: same email + same store within ten minutes (a
    //    retry or a double click) is acknowledged without a second row or email.
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
    const { data: recent, error: recentError } = await supabase
      .from('contact_submissions')
      .select('id, website')
      .eq('email', lead.email)
      .eq('service', GROWTH_REQUEST_SERVICE)
      .gte('created_at', since)
      .limit(10)
    if (!recentError && Array.isArray(recent)) {
      const key = comparableStoreKey(lead.website)
      if (recent.some((row: { website?: string | null }) => row.website && comparableStoreKey(row.website) === key)) {
        return NextResponse.json({ success: true, duplicate: true })
      }
    }

    // 6. Persist. Identity is the store hostname — never an invented person.
    const host = storeHostname(lead.website)
    const fullName = `Growth Review — ${host}`
    const { data: inquiry, error: dbError } = await supabase
      .from('contact_submissions')
      .insert([
        {
          full_name: fullName,
          email: lead.email,
          company: null,
          phone: null,
          website: lead.website,
          service: GROWTH_REQUEST_SERVICE,
          message: buildStoredMessage(lead.biggest_challenge, lead.attribution),
          form_type: 'contact',
          source: 'website_contact_form',
          status: 'new',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error('[growth-request] database error:', dbError.message)
      return NextResponse.json({ error: 'We couldn’t save your request. Please try again.' }, { status: 500 })
    }

    // 7. Email — best effort. The lead is already saved.
    const submissionId: string | null = inquiry?.id ? String(inquiry.id) : null
    const attemptKey = typeof body.submission_key === 'string' && UUID_RE.test(body.submission_key) ? body.submission_key.toLowerCase() : submissionId
    const submittedAt = `${new Date().toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC`
    const source = [lead.attribution.utm_source, lead.attribution.utm_campaign].filter(Boolean).join(' · ') || null

    const [acknowledgement, notification] = await Promise.allSettled([
      sendGrowthRequestAcknowledgementEmail({ email: lead.email, website: lead.website, idempotencyKey: attemptKey }),
      sendAdminContactNotification({
        fullName,
        email: lead.email,
        phone: null,
        company: null,
        website: lead.website,
        service: GROWTH_REQUEST_SERVICE,
        message: lead.biggest_challenge,
        isConsultation: false,
        submissionId,
        growthReview: { source, submittedAt },
      }),
    ])
    for (const [label, result] of [['acknowledgement', acknowledgement], ['admin notification', notification]] as const) {
      if (result.status === 'rejected') console.warn(`[growth-request] ${label} threw — lead is saved`)
      else if (!result.value.ok) console.warn(`[growth-request] ${label} not sent: ${result.value.outcome}`)
    }

    return NextResponse.json({ success: true, duplicate: false })
  } catch (error) {
    console.error('[growth-request] unexpected error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Something went wrong on our side. Please try again shortly.' }, { status: 500 })
  }
}
