// src/app/api/admin/growth-assessments/[id]/resolve-merchant/route.ts
//
// The authorized way to finish an AMBIGUOUS submission.
//
// WHY THIS EXISTS. When a submitted address matches several merchant records,
// submit_growth_assessment() refuses to guess which one it is: the assessment
// is saved with merchant_id NULL and merchant_resolution = 'ambiguous', and —
// because growth_reviews.merchant_id is NOT NULL — no review row is created
// either. Without this endpoint such a submission would sit in the database
// forever with nothing able to move it forward. It is not dropped, and it is
// not auto-assigned; a named admin chooses the merchant.
//
// GET  lists the candidate merchants that share the submitted address, so the
//      choice is made from the real candidates rather than typed from memory.
// POST records the choice, links the assessment, and creates the review.
//
// WHAT IT WILL NOT DO: it never creates a merchant, never merges two merchants,
// never deletes anything, and refuses a merchant whose address is not the
// address that was actually submitted. It also never moves an existing
// merchant's lifecycle backward — resolve_ambiguous_submission() repairs a
// missing merchant_status row but leaves an existing one alone.
//
// Not covered by middleware.ts, so the admin gate is re-verified here.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

const REFUSAL_MESSAGES: Record<string, string> = {
  merchant_not_found: 'That merchant record no longer exists.',
  assessment_not_found: 'That assessment no longer exists.',
  already_resolved:
    'This submission already has a merchant. Nothing was changed.',
  not_ambiguous:
    'This submission was not left ambiguous, so there is nothing to resolve here.',
  submitted_email_unavailable:
    'The address submitted with this assessment could not be read, so it cannot be ' +
    'matched to a merchant safely. Resolve this one by hand.',
  merchant_email_mismatch:
    'That merchant’s email address is not the address this assessment was submitted ' +
    'with. Only a merchant sharing the submitted address can be chosen here — ' +
    'nothing was changed.',
}

/** The merchants that made this submission ambiguous in the first place. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth

  const assessmentId = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(assessmentId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { data: assessment, error: assessmentError } = await db
      .from('growth_assessments')
      .select('id, merchant_id, merchant_resolution, raw_answers_json, created_at')
      .eq('id', assessmentId)
      .maybeSingle()

    if (assessmentError) return queryFailure('assessment read', assessmentError)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const submittedEmail =
      typeof assessment.raw_answers_json?.email === 'string'
        ? assessment.raw_answers_json.email.trim().toLowerCase()
        : ''

    if (!submittedEmail) {
      return NextResponse.json({
        assessment: { id: assessment.id, merchant_resolution: assessment.merchant_resolution },
        candidates: [],
        note: 'The submitted address could not be read from this assessment.',
      })
    }

    // The candidate set is derived from the stored submission, not from a
    // caller-supplied filter.
    const { data: candidates, error: candidateError } = await db
      .from('merchants')
      .select('id, business_name, contact_name, email, website, created_at')
      .ilike('email', submittedEmail)
      .order('created_at', { ascending: true })

    if (candidateError) return queryFailure('candidate read', candidateError)

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        merchant_id: assessment.merchant_id,
        merchant_resolution: assessment.merchant_resolution,
        created_at: assessment.created_at,
      },
      candidates: candidates || [],
    })
  } catch (error) {
    return queryFailure('candidate read', error)
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  const assessmentId = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(assessmentId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const merchantId =
    typeof (body as { merchant_id?: unknown }).merchant_id === 'string'
      ? (body as { merchant_id: string }).merchant_id.trim()
      : ''

  if (!ADMIN_UUID_RE.test(merchantId)) {
    return NextResponse.json({ error: 'A merchant must be chosen.' }, { status: 400 })
  }

  try {
    // One transaction: link, create the review, repair the lifecycle row.
    const { data: result, error } = await db.rpc('resolve_ambiguous_submission', {
      p_assessment_id: assessmentId,
      p_merchant_id: merchantId,
      p_actor: userId,
    })

    if (error) return queryFailure('resolve ambiguous submission', error)

    if (!result?.ok) {
      const reason = String(result?.reason ?? 'unknown')
      if (reason === 'assessment_not_found' || reason === 'merchant_not_found') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(
        {
          error: REFUSAL_MESSAGES[reason] || 'That submission could not be resolved.',
          code: reason,
        },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      assessment_id: result.assessment_id,
      merchant_id: result.merchant_id,
      review_id: result.review_id,
      // Said explicitly: resolving identity is not approving the merchant.
      approved: false,
      message:
        'Merchant linked and the review created. This is identity resolution only — ' +
        'program approval remains a separate decision.',
    })
  } catch (error) {
    return queryFailure('resolve ambiguous submission', error)
  }
}
