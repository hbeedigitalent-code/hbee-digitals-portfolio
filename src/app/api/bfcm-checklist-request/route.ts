// src/app/api/bfcm-checklist-request/route.ts
//
// PUBLIC endpoint behind "Send Me the Checklist" on /bfcm-readiness-checklist:
// an email, an optional store URL and campaign attribution. It captures a LEAD
// and nothing else — no scoring, no merchant, no Growth Profile, no account.
//
// Stored in the existing contact_submissions table with the same column values
// /api/contact and /api/growth-review-request already write (production schema
// verified: full_name/email/message NOT NULL, no CHECK constraints). `service`
// marks the row so the Admin inbox can badge it.
//
// ORDER (cheapest rejection first): rate limit → honeypot → Turnstile →
// validation → duplicate check → insert → best-effort email. A failed check
// costs nothing; once the row exists, no email problem can fail the request.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTurnstileToken, turnstileFailureMessage } from '@/lib/turnstile'
import { checkRateLimit, getClientIp, rateLimitMessage } from '@/lib/rate-limit'
import { comparableStoreKey } from '@/lib/validators/growth-request-payload'
import {
  CHECKLIST_REQUEST_MESSAGE,
  CHECKLIST_REQUEST_SERVICE,
  buildStoredMessage,
  checklistIdentity,
  validateChecklistRequestPayload,
} from '@/lib/validators/checklist-request-payload'
import { sendChecklistAcknowledgementEmail } from '@/lib/emails/bfcm-checklist-acknowledgement'
import { sendAdminContactNotification } from '@/lib/emails/admin-contact-notification'

const HONEYPOT_FIELD = 'hb_extra'
const DUPLICATE_WINDOW_MS = 10 * 60_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[checklist-request] Supabase environment variables are not set')
      return NextResponse.json({ error: 'Something went wrong on our side. Please try again shortly.' }, { status: 500 })
    }

    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const body = rawBody as Record<string, unknown>

    const clientIp = getClientIp(req)
    const limit = await checkRateLimit('checklist_request', clientIp)
    if (!limit.ok) {
      return NextResponse.json(
        { error: rateLimitMessage(limit.retryAfterSeconds) },
        { status: 429, headers: limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : undefined },
      )
    }

    // Honeypot: a filled trap gets the same answer a real visitor gets, and costs nothing.
    const trap = body[HONEYPOT_FIELD]
    if (typeof trap === 'string' && trap.trim() !== '') {
      return NextResponse.json({ success: true, duplicate: false })
    }

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

    const validation = validateChecklistRequestPayload(body)
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 })
    const lead = validation.value

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Duplicate protection: same email within ten minutes (the form has no other identity).
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
    const { data: recent, error: recentError } = await supabase
      .from('contact_submissions')
      .select('id, website')
      .eq('email', lead.email)
      .eq('service', CHECKLIST_REQUEST_SERVICE)
      .gte('created_at', since)
      .limit(10)
    if (!recentError && Array.isArray(recent)) {
      const key = lead.website ? comparableStoreKey(lead.website) : null
      const same = recent.some((row: { website?: string | null }) => (row.website ? comparableStoreKey(row.website) : null) === key)
      if (same) return NextResponse.json({ success: true, duplicate: true })
    }

    const fullName = `BFCM Checklist — ${checklistIdentity(lead.email, lead.website)}`
    const { data: inquiry, error: dbError } = await supabase
      .from('contact_submissions')
      .insert([
        {
          full_name: fullName,
          email: lead.email,
          company: null,
          phone: null,
          website: lead.website,
          service: CHECKLIST_REQUEST_SERVICE,
          message: buildStoredMessage(CHECKLIST_REQUEST_MESSAGE, lead.attribution),
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
      console.error('[checklist-request] database error:', dbError.message)
      return NextResponse.json({ error: 'We couldn’t save your request. Please try again.' }, { status: 500 })
    }

    // Email — best effort. The lead is already saved.
    const submissionId: string | null = inquiry?.id ? String(inquiry.id) : null
    const attemptKey = typeof body.submission_key === 'string' && UUID_RE.test(body.submission_key) ? body.submission_key.toLowerCase() : submissionId
    const submittedAt = `${new Date().toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC`
    const source = [lead.attribution.utm_source, lead.attribution.utm_campaign].filter(Boolean).join(' · ') || null

    const [acknowledgement, notification] = await Promise.allSettled([
      sendChecklistAcknowledgementEmail({ email: lead.email, idempotencyKey: attemptKey }),
      sendAdminContactNotification({
        fullName,
        email: lead.email,
        phone: null,
        company: null,
        website: lead.website,
        service: CHECKLIST_REQUEST_SERVICE,
        message: CHECKLIST_REQUEST_MESSAGE,
        isConsultation: false,
        submissionId,
        checklist: { source, submittedAt },
      }),
    ])
    for (const [label, result] of [['acknowledgement', acknowledgement], ['admin notification', notification]] as const) {
      if (result.status === 'rejected') console.warn(`[checklist-request] ${label} threw — lead is saved`)
      else if (!result.value.ok) console.warn(`[checklist-request] ${label} not sent: ${result.value.outcome}`)
    }

    return NextResponse.json({ success: true, duplicate: false })
  } catch (error) {
    console.error('[checklist-request] unexpected error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Something went wrong on our side. Please try again shortly.' }, { status: 500 })
  }
}
