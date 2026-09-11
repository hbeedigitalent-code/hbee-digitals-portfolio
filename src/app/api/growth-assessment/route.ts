// src/app/api/growth-assessment/route.ts
// No 'use client' needed - API route

import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomUUID } from 'crypto'
import { 
  calculateVisibilityScore,
  calculateConversionScore,
  calculateRetentionScore,
  calculateAuthorityScore,
  calculateScalabilityScore,
  calculateHGRI,
  detectPrimaryConstraint
} from '@/lib/scoring/hgri-scoring'
import { createNotification } from '@/lib/notifications/createNotification'
import { verifyTurnstileToken, turnstileFailureMessage } from '@/lib/turnstile'
import { validateAssessmentPayload } from '@/lib/validators/assessment-payload'

/** Submission keys are browser-generated UUIDs. Anything else is ignored. */
const SUBMISSION_KEY_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Lazy initialize Supabase client
let supabaseAdmin: any = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are not set')
    return null
  }
  
  // Dynamic import to avoid build-time issues
  const { createClient } = require('@supabase/supabase-js')
  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  return supabaseAdmin
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  
  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase not configured - missing environment variables')
    return NextResponse.json(
      { error: 'Server configuration error. Please check environment variables.' },
      { status: 500 }
    )
  }

  try {
    const rawBody = await request.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // ------------------------------------------------------------------
    // 0. Turnstile — verified BEFORE any validation, database write or email.
    //    A failed check must cost nothing: no merchant row, no assessment,
    //    no review, no notification, no message to the supplied address.
    // ------------------------------------------------------------------
    const turnstileToken = (rawBody as Record<string, unknown>).turnstile_token
    const remoteIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null

    const turnstile = await verifyTurnstileToken(turnstileToken, remoteIp)
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
    // 1. Strict field validation against an explicit allow-list.
    //    `body` is rebuilt from known keys only — the raw request object is
    //    never spread into a database row, and turnstile_token cannot reach
    //    storage because it is not a field name below.
    // ------------------------------------------------------------------
    const validation = validateAssessmentPayload(rawBody as Record<string, unknown>)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const body = validation.value

    // Prepare scoring input
    const scoringInput = {
      marketingChannels: body.marketing_channels || [],
      contentPublishing: body.content_publishing || '',
      visibilityConfidence: body.visibility_confidence || 0,
      businessStage: body.business_stage || '',
      customerReviews: body.customer_reviews || '',
      upsellsCrosssells: body.upsells_crosssells || '',
      primaryGoals: body.primary_goals || [],
      emailCapture: body.email_capture || '',
      emailAutomations: body.email_automations || '',
      improvementTimeline: body.improvement_timeline || '',
      supportType: body.support_type || ''
    }

    // Calculate scores
    const visibilityScore = calculateVisibilityScore(scoringInput)
    const conversionScore = calculateConversionScore(scoringInput)
    const retentionScore = calculateRetentionScore(scoringInput)
    const authorityScore = calculateAuthorityScore(scoringInput)
    const scalabilityScore = calculateScalabilityScore(scoringInput)
    
    const { total: hgriScore, classification } = calculateHGRI(
      visibilityScore,
      conversionScore,
      retentionScore,
      authorityScore,
      scalabilityScore
    )

    const { constraint: primaryConstraint, focus: recommendedFocus } = 
      detectPrimaryConstraint(scoringInput)

    // ------------------------------------------------------------------
    // 2. ONE TRANSACTION, VIA submit_growth_assessment().
    //
    // This endpoint used to perform five separate writes — merchant, assessment,
    // merchant_status, growth_review, then the emails — each of which could
    // fail independently. A crash between them left a submission with no review
    // and no receipt, and a retry could not repair it: a unique submission_key
    // stops a second ASSESSMENT row and nothing else.
    //
    // All of it now commits together. A retry with the same key either finds the
    // whole thing done, or completes the parts that are missing.
    //
    // The email events are enqueued INSIDE that transaction too, so the receipt
    // is durably owed the moment the assessment exists. The inline send below is
    // a latency optimisation on top of a queue that is already authoritative.
    // ------------------------------------------------------------------
    const submissionKey =
      typeof (rawBody as Record<string, unknown>).submission_key === 'string' &&
      SUBMISSION_KEY_RE.test(((rawBody as Record<string, string>).submission_key).trim())
        ? ((rawBody as Record<string, string>).submission_key).trim()
        : randomUUID()

    // The key is bound to the CONTENT it was first used with. Reusing it for
    // different answers is refused rather than silently overwriting or silently
    // returning someone else's result.
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex')

    const { data: submission, error: submitError } = await supabase.rpc(
      'submit_growth_assessment',
      {
        p_submission_key: submissionKey,
        p_fingerprint: fingerprint,
        p_email: body.email,
        p_assessment: {
          hgri_score: hgriScore,
          classification,
          primary_constraint: primaryConstraint,
          recommended_focus: recommendedFocus,
          visibility_score: visibilityScore,
          conversion_score: conversionScore,
          retention_score: retentionScore,
          authority_score: authorityScore,
          scalability_score: scalabilityScore,
          // The VALIDATED payload, never the raw request object.
          raw_answers_json: body,
        },
        p_merchant: {
          business_name: body.business_name,
          website: body.website,
          contact_name: body.contact_name,
          email: body.email,
          country: body.country,
          industry: body.industry,
          business_stage: body.business_stage,
          store_age: body.store_age,
        },
        p_email_events: [
          {
            event_key: `assessment_received:${submissionKey}`,
            template_slug: 'assessment-received',
            recipient_email: body.email,
            recipient_name: body.contact_name,
            payload: {
              firstName: body.contact_name.split(' ')[0] || body.contact_name,
              email: body.email,
              portalUrl: '/client-signup',
            },
          },
          {
            event_key: `admin_growth_assessment:${submissionKey}`,
            template_slug: 'admin-growth-assessment',
            recipient_email: process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@hbeedigitals.com',
            recipient_name: 'Hbee Digitals admin',
            payload: {
              contactName: body.contact_name,
              businessName: body.business_name,
              email: body.email,
            },
          },
        ],
      },
    )

    if (submitError) {
      console.error(
        `[assessment] submit failed (code=${
          (submitError as { code?: string }).code ?? 'n/a'
        })`,
      )
      return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 })
    }

    if (!submission?.ok) {
      if (submission?.reason === 'submission_key_conflict') {
        // Deliberately says nothing about the earlier submission — not its id,
        // not its owner, not its content.
        return NextResponse.json(
          { error: 'That submission reference has already been used. Please start a new assessment.' },
          { status: 409 },
        )
      }
      console.error(`[assessment] submit refused: ${submission?.reason ?? 'unknown'}`)
      return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 })
    }

    const assessmentId: string = submission.assessment_id
    const merchantId: string | null = submission.merchant_id ?? null
    const reviewId: string | null = submission.review_id ?? null
    const isRetry: boolean = submission.duplicate === true

    // An address shared by several merchant records is NOT resolved by guessing.
    // The submission is stored and flagged; an admin decides which merchant it
    // belongs to. Nothing is merged and nothing is lost.
    if (submission.merchant_resolution === 'ambiguous') {
      console.warn(
        `[assessment ${assessmentId}] merchant identity is ambiguous — stored for explicit admin resolution`,
      )
    }

    // ------------------------------------------------------------------
    // 3. Emails.
    //
    // THE ASSESSMENT IS ALREADY STORED, and its receipts are already QUEUED, in
    // the same transaction. Nothing below may fail the request or tell the
    // merchant to resubmit. The inline attempt just makes the ordinary case
    // instant; if it fails, the scheduled worker retries from the queue.
    // ------------------------------------------------------------------
    const emailOutcomes: Record<string, string> = {}

    if (!isRetry) {
      try {
        const { deliverQueuedEvent } = await import('@/lib/emails/outbox')
        emailOutcomes.merchant_receipt = (
          await deliverQueuedEvent(`assessment_received:${submissionKey}`)
        ).outcome
        emailOutcomes.admin_notification = (
          await deliverQueuedEvent(`admin_growth_assessment:${submissionKey}`)
        ).outcome
      } catch (emailError) {
        emailOutcomes.inline_send = 'failed'
        console.error('Inline email send error:', emailError)
      }
    }

    // One summary line per submission, for the server log. This is OPERATIONAL
    // VISIBILITY, NOT DELIVERY TRACKING — that lives in email_events and
    // email_logs, both of which are durable and queryable.
    console.info(
      `[assessment ${assessmentId}] retry=${isRetry} ` +
        `merchant=${submission.merchant_resolution ?? 'n/a'} ` +
        `inline: ${Object.entries(emailOutcomes).map(([k, v]) => k + '=' + v).join(', ') || 'skipped'}`,
    )

    // ------------------------------------------------------------------
    // 4. The in-app admin notification. Idempotent on its own key, so a retry
    //    cannot produce a second one.
    // ------------------------------------------------------------------
    await createNotification({
      scope: 'admin',
      recipientId: null,
      type: 'assessment_submitted',
      title: 'New Assessment Submitted',
      message: `${body.business_name} has submitted a growth assessment.`,
      entityType: 'assessment',
      entityId: assessmentId,
      link: reviewId
        ? `/admin/growth-reviews/${reviewId}`
        : `/admin/growth-assessments/${assessmentId}`,
    })

    return NextResponse.json({
      success: true,
      data: {
        merchant_id: merchantId,
        assessment_id: assessmentId,
        review_id: reviewId,
        // NOTE: email outcomes are deliberately NOT returned here.
        //
        // This endpoint is PUBLIC. Telling an anonymous caller whether an
        // internal admin notification was sent, or that a server
        // configuration value is missing, discloses internal state to someone
        // with no business knowing it. Outcomes go to the server log instead
        // (see the email block above), and will move to the durable
        // event/delivery record plus an authorized admin view when that batch
        // lands. Neither a log line nor a response field is durable delivery
        // tracking.
        hgri_score: hgriScore,
        classification: classification,
        primary_constraint: primaryConstraint,
        recommended_focus: recommendedFocus,
        score_breakdown: {
          visibility: visibilityScore,
          conversion: conversionScore,
          retention: retentionScore,
          authority: authorityScore,
          scalability: scalabilityScore,
          total: hgriScore
        }
      }
    })

  } catch (error) {
    console.error('Assessment submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}