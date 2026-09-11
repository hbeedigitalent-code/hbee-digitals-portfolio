// src/app/api/admin/growth-assessments/[id]/decision/route.ts
//
// The deliberate program decision. This is the ONLY writer of
// growth_program_decisions, and that table is the ONLY thing that authorizes a
// Growth Profile release.
//
// WHY A SEPARATE TABLE. `growth_assessments.review_status = 'approved'` cannot
// evidence a program decision. At least two writers set that value without
// recording who decided or when: the old review-completion route, and a
// browser-side flow in /admin/growth-assessments/[id] that wrote 'approved' for
// any completed review. Four rows currently carry that value with UNVERIFIED
// PROVENANCE. They are preserved exactly as they are — not downgraded, not
// deleted, not released, and no historical approval email is sent for them. To
// act on one, an admin must make a fresh decision here, and must explicitly
// acknowledge that the stored status has no recorded provenance.
//
// WHAT IS RECORDED: the acting admin (from their own session, never a request
// field), the decision, the timestamp, the assessment, and the merchant and
// client as they stood at that moment.
//
// WHAT IS NOT DONE: no merchant is linked to a client, no client is merged, no
// account is created, and no email is sent from here. Approval requires that
// the merchant -> client -> profile relationship ALREADY exists correctly; if it
// does not, the request is refused with the missing link named, and a human
// resolves it deliberately.
//
// Ordinary client signup is untouched by all of this. Having an account is not
// program approval, and program approval does not create an account.
//
// Not covered by middleware.ts, so the admin gate is re-verified here.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

const DECISIONS = ['approved', 'declined', 'withdrawn'] as const
type Decision = (typeof DECISIONS)[number]

const MAX_NOTES = 2000

/**
 * A new deliberate decision also updates the assessment's own review_status, so
 * the admin lists stay coherent with the decision that was actually made. This
 * is not a backfill: it happens only for a decision an admin makes here and
 * now, and only for that one assessment. `withdrawn` leaves review_status alone
 * — withdrawing a release is not the same as reversing the review.
 */
const REVIEW_STATUS_FOR: Partial<Record<Decision, string>> = {
  approved: 'approved',
  declined: 'rejected',
}

// growth_assessments has NO business_name column — the business name lives on
// merchants, and is read through the embedded relationship below rather than
// from a duplicate that does not exist.
const ASSESSMENT_COLUMNS =
  'id, merchant_id, review_status, reviewed_at, created_at, merchants(business_name)'

/**
 * Every refusal record_program_decision() can return, mapped to something an
 * admin can act on. Each one names the missing relationship; none of them
 * repairs it, because linking and merging are deliberate acts with their own
 * authorized endpoint (/api/admin/clients/link-merchant).
 */
const REFUSAL_MESSAGES: Record<string, string> = {
  merchant_not_linked:
    'This assessment is not linked to a merchant record, so there is nothing to ' +
    'release. Resolve the merchant link before deciding.',
  client_not_linked:
    'No portal account is linked to this merchant. Approval does not create or ' +
    'link an account — link it deliberately, then approve.',
  client_link_ambiguous:
    'More than one portal account is linked to this merchant. Resolve that before ' +
    'approving; nothing is merged automatically.',
  profile_missing:
    'No Growth Profile has been built from THIS assessment yet. An approval ' +
    'releases the profile for the assessment it names, not whichever profile is ' +
    'currently active. Complete this review first, then approve its release.',
  profile_ambiguous:
    'This assessment has more than one Growth Profile. Resolve that before ' +
    'approving, so the decision names exactly one profile.',
  assessment_not_reviewed:
    'This assessment has not been reviewed yet, so there is nothing to approve. ' +
    'Complete the review first — completing it is not itself an approval.',
  review_missing:
    'No review record exists for this assessment and merchant. It cannot be ' +
    'approved until the review it belongs to is in place.',
  review_not_completed:
    'The review for this assessment is not finished. Complete it before recording ' +
    'a program decision.',
  merchant_changed_concurrently:
    'This assessment’s merchant link changed while the decision was being ' +
    'recorded. Nothing was written — reload and check the link, then try again.',
  merchant_not_found:
    'The merchant this assessment points at no longer exists. Nothing was written.',
  unverified_historical_approval:
    'This assessment is already marked approved, but no decision record exists for ' +
    'it, so who approved it and when is not established. Confirm that you are ' +
    'making this decision deliberately to continue.',
  unknown_decision: 'That is not a decision this endpoint recognises.',
}

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
      .select(ASSESSMENT_COLUMNS)
      .eq('id', assessmentId)
      .maybeSingle()

    if (assessmentError) return queryFailure('assessment read', assessmentError)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: decisions, error: decisionError } = await db
      .from('growth_program_decisions')
      .select('id, decision, decided_by, decided_at, notes, acknowledged_unverified_history')
      .eq('assessment_id', assessmentId)
      .order('decided_at', { ascending: false })

    if (decisionError) return queryFailure('decision read', decisionError)

    const history = decisions || []

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        // From the merchant, which is where it actually lives.
        business_name:
          (Array.isArray((assessment as any).merchants)
            ? (assessment as any).merchants[0]?.business_name
            : (assessment as any).merchants?.business_name) ?? null,
        review_status: assessment.review_status,
        reviewed_at: assessment.reviewed_at,
      },
      decisions: history,
      current: history[0] || null,
      // The whole point of the separate table: say plainly when a stored
      // 'approved' has no decision behind it.
      provenance:
        history.length > 0
          ? 'recorded'
          : assessment.review_status === 'approved'
            ? 'unverified_historical'
            : 'none',
    })
  } catch (error) {
    return queryFailure('decision read', error)
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

  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const decision = body?.decision
    if (!DECISIONS.includes(decision)) {
      return NextResponse.json({ error: 'Unknown decision.' }, { status: 400 })
    }

    const notes =
      typeof body?.notes === 'string' && body.notes.trim()
        ? body.notes.trim().slice(0, MAX_NOTES)
        : null

    // ---- ONE TRANSACTION: record_program_decision() --------------------
    //
    // Every relationship is validated TOGETHER inside the function, against the
    // stored rows, while the assessment row is locked:
    //
    //   * the assessment exists and names a merchant  (a decision with no
    //     merchant reference authorizes nothing, and is refused);
    //   * exactly one client is linked to that merchant;
    //   * exactly one active profile belongs to that merchant AND was built
    //     from an assessment of that same merchant;
    //   * a stored review_status of 'approved' with no decision behind it
    //     requires an explicit acknowledgement.
    //
    // The approved profile id is RECORDED on the decision, so release is later
    // bound to the profile that was actually authorized rather than to whichever
    // profile happens to be active by then.
    //
    // Concurrency is deterministic: the assessment lock serialises simultaneous
    // decisions, and every row carries a monotonic decision_seq, so "the current
    // decision" can never be a tie.
    const { data: outcome, error: rpcError } = await db.rpc('record_program_decision', {
      p_assessment_id: assessmentId,
      p_decision: decision,
      p_actor: userId,
      p_notes: notes,
      p_acknowledge_history: body?.acknowledgeUnverifiedHistory === true,
    })

    if (rpcError) return queryFailure('decision write', rpcError)

    if (!outcome?.ok) {
      const reason = String(outcome?.reason ?? 'unknown')
      const message = REFUSAL_MESSAGES[reason]

      if (reason === 'assessment_not_found') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      if (reason === 'unverified_historical_approval') {
        return NextResponse.json(
          { error: reason, message: REFUSAL_MESSAGES[reason], requiresAcknowledgement: true },
          { status: 409 },
        )
      }
      if (message) {
        return NextResponse.json({ error: reason, message }, { status: 409 })
      }

      console.error(`[decision] refused: ${reason}`)
      return NextResponse.json({ error: 'Failed to record the decision' }, { status: 500 })
    }

    // ---- Mirror onto the assessment, for THIS assessment only ----------
    let reviewStatus: 'updated' | 'unchanged' | 'failed' = 'unchanged'
    const nextStatus = REVIEW_STATUS_FOR[decision as Decision]

    if (nextStatus) {
      const { error: statusError } = await db
        .from('growth_assessments')
        .update({ review_status: nextStatus })
        .eq('id', assessmentId)

      // Reported separately from `success`: the decision record is the
      // authoritative one and is already committed inside its own transaction.
      // This mirror is a SECOND write, and the response does not pretend the
      // two are atomic.
      reviewStatus = statusError ? 'failed' : 'updated'
      if (statusError) {
        console.error(
          `[decision] assessment ${assessmentId} decision recorded but review_status ` +
            `not updated (code=${(statusError as { code?: string }).code ?? 'n/a'})`,
        )
      }
    }

    return NextResponse.json({
      success: true,
      decision: {
        id: outcome.id,
        decision,
        decision_seq: outcome.decision_seq,
        merchant_id: outcome.merchant_id,
        client_id: outcome.client_id,
        // The profile this decision authorizes. Release is bound to it.
        profile_id: outcome.profile_id ?? null,
        acknowledged_unverified_history: outcome.historical === true,
      },
      reviewStatus,
      // Release stays behind GROWTH_PROFILE_RELEASE_ENABLED as well. Recording
      // an approval does not by itself publish anything.
      releaseEnabled: process.env.GROWTH_PROFILE_RELEASE_ENABLED === 'true',
    })
  } catch (error) {
    return queryFailure('decision write', error)
  }
}
