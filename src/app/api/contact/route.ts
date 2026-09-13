// src/app/api/contact/route.ts
//
// PUBLIC, UNAUTHENTICATED endpoint reached by two forms:
//   - ContactSection.tsx        (form_type 'contact')
//   - ConsultationPopup.tsx     (form_type 'free_consultation')
//
// It writes with the SERVICE-ROLE key, which bypasses RLS. That combination —
// no authentication plus an RLS-bypassing credential — is why every guard below
// exists.
//
// ORDER OF CHECKS IS DELIBERATE, cheapest rejection first:
//   1. Rate limit   — a Redis round trip, no third party.
//   2. Turnstile    — a network call to Cloudflare, so it runs only for callers
//                     that are already within their rate limit. A flood cannot
//                     be used to burn siteverify calls.
//   3. Validation   — pure CPU, but there is no point validating a payload that
//                     has already been rejected.
//   4. Database write, then email.
// A failed check must cost nothing beyond the check itself: no row, no email to
// the supplied address.
//
// EMAIL IS NOT BUILT HERE ANY MORE. This route used to interpolate submitted
// values into hand-written HTML, which put unescaped visitor input into a staff
// inbox. Both messages now render through src/lib/emails/layout.ts, which
// escapes every dynamic value and produces a plain-text alternative.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTurnstileToken, turnstileFailureMessage } from '@/lib/turnstile'
import { validateContactPayload } from '@/lib/validators/contact-payload'
import { checkRateLimit, getClientIp, rateLimitMessage } from '@/lib/rate-limit'
import { sendContactConfirmation } from '@/lib/emails/contact-confirmation'
import { sendAdminContactNotification } from '@/lib/emails/admin-contact-notification'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[contact] Supabase environment variables are not set')
      return NextResponse.json(
        { error: 'Database configuration error. Please try again later.' },
        { status: 500 },
      )
    }

    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const body = rawBody as Record<string, unknown>

    // ------------------------------------------------------------------
    // 1. Rate limit
    // ------------------------------------------------------------------
    const clientIp = getClientIp(req)
    const limit = await checkRateLimit('contact', clientIp)
    if (!limit.ok) {
      return NextResponse.json(
        { error: rateLimitMessage(limit.retryAfterSeconds) },
        {
          status: 429,
          headers: limit.retryAfterSeconds
            ? { 'Retry-After': String(limit.retryAfterSeconds) }
            : undefined,
        },
      )
    }

    // ------------------------------------------------------------------
    // 2. Turnstile — verified BEFORE any validation, database write or email.
    // ------------------------------------------------------------------
    const turnstile = await verifyTurnstileToken(body.turnstile_token, clientIp)
    if (!turnstile.ok) {
      return NextResponse.json(
        {
          error: turnstileFailureMessage(turnstile.reason),
          // Lets the browser reset the widget for a retryable failure without
          // exposing Cloudflare's error vocabulary.
          retryable: turnstile.reason === 'expired' || turnstile.reason === 'unreachable',
        },
        { status: turnstile.reason === 'not-configured' ? 500 : 400 },
      )
    }

    // ------------------------------------------------------------------
    // 3. Validation. Reconciles both form shapes and rebuilds the payload from
    //    an allow-list, so turnstile_token cannot reach a column.
    // ------------------------------------------------------------------
    const validation = validateContactPayload(body)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const contact = validation.value

    // ------------------------------------------------------------------
    // 4. Persist. Same columns as before.
    // ------------------------------------------------------------------
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: inquiry, error: dbError } = await supabase
      .from('contact_submissions')
      .insert([
        {
          full_name: contact.full_name,
          email: contact.email,
          company: contact.company,
          phone: contact.phone,
          website: contact.website,
          service: contact.service,
          message: contact.message,
          form_type: contact.form_type,
          source: contact.source,
          status: 'new',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error('[contact] database error:', dbError.message)
      return NextResponse.json(
        { error: 'Unable to save your inquiry. Please try again.' },
        { status: 500 },
      )
    }

    // ------------------------------------------------------------------
    // 5. Email. Best-effort: the submission is already saved, so a delivery
    //    problem must not fail the request or ask the visitor to resubmit.
    //    deliver() records every attempt in email_logs and never throws.
    // ------------------------------------------------------------------
    const isConsultation = contact.form_type === 'free_consultation'
    const submissionId: string | null = inquiry?.id ? String(inquiry.id) : null

    const [confirmation, notification] = await Promise.all([
      sendContactConfirmation(
        contact.full_name,
        contact.email,
        isConsultation,
        submissionId,
      ),
      sendAdminContactNotification({
        fullName: contact.full_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        website: contact.website,
        service: contact.service,
        message: contact.message,
        isConsultation,
        submissionId,
      }),
    ])

    if (!confirmation.ok) {
      console.warn(`[contact] confirmation email not sent: ${confirmation.outcome}`)
    }
    if (!notification.ok) {
      console.warn(`[contact] admin notification not sent: ${notification.outcome}`)
    }

    return NextResponse.json({
      success: true,
      form_type: contact.form_type,
      message: 'Form submitted successfully!',
    })
  } catch (error) {
    // The message is logged, never returned: it can carry internal detail, and
    // the previous version echoed error.message straight to the caller.
    console.error(
      '[contact] unexpected error:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return NextResponse.json(
      { error: 'Unable to submit inquiry right now.' },
      { status: 500 },
    )
  }
}
