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
import { sendContactAcknowledgementEmail } from '@/lib/emails/contact-acknowledgement'
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

    // Phase 17 — the rebuilt Contact page ('enquiry'). contact_submissions has
    // no budget/timeline columns and its form_type/source values may be
    // constrained, so an enquiry is stored with the EXISTING values ('contact' /
    // 'website_contact_form'); the enquiry type goes in `service`, and the two
    // optional answers are appended to the stored message under a separator so
    // the admin inbox still shows them. No schema change.
    const isEnquiry = contact.form_type === 'enquiry'
    const enquiryDetails = isEnquiry
      ? [
          contact.enquiry?.budget ? `Estimated budget: ${contact.enquiry.budget}` : null,
          contact.enquiry?.timeline ? `Timeline: ${contact.enquiry.timeline}` : null,
        ].filter(Boolean)
      : []
    const storedMessage = enquiryDetails.length
      ? `${contact.message}\n\n—\n${enquiryDetails.join('\n')}`
      : contact.message

    // Idempotency for the enquiry form: an identical submission from the same
    // address within ten minutes (a retry, a double send) is acknowledged as
    // success without a second row or a second pair of emails.
    if (isEnquiry) {
      const { data: recent, error: recentError } = await supabase
        .from('contact_submissions')
        .select('id')
        .eq('email', contact.email)
        .eq('message', storedMessage)
        .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString())
        .limit(1)
      if (!recentError && recent && recent.length > 0) {
        return NextResponse.json({ success: true, form_type: 'enquiry', message: 'Form submitted successfully!' })
      }
    }

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
          message: storedMessage,
          form_type: isEnquiry ? 'contact' : contact.form_type,
          source: isEnquiry ? 'website_contact_form' : contact.source,
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

    // The acknowledgement is keyed by the client's attempt key when present (a
    // retry of the same attempt cannot send twice), otherwise by the stored row.
    const ackKey = contact.enquiry?.submissionKey ?? submissionId
    const submittedAt = `${new Date().toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC`

    const [confirmation, notification] = await Promise.all([
      isEnquiry
        ? sendContactAcknowledgementEmail({
            fullName: contact.full_name,
            email: contact.email,
            enquiryType: contact.enquiry!.enquiryType,
            company: contact.company,
            budget: contact.enquiry?.budget ?? null,
            timeline: contact.enquiry?.timeline ?? null,
            idempotencyKey: ackKey,
          })
        : sendContactConfirmation(
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
        ...(isEnquiry
          ? {
              enquiry: {
                enquiryType: contact.enquiry!.enquiryType,
                budget: contact.enquiry?.budget,
                timeline: contact.enquiry?.timeline,
                submittedAt,
              },
            }
          : {}),
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
