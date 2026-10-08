// src/app/api/admin/growth-assessments/[id]/invite/route.ts
//
// POST — send (or re-send) the portal invitation for a REVIEWED merchant.
//
// This is the account-invitation step, kept separate from the program decision.
// It is how a merchant with no portal account gets one linked to THEIR merchant
// record: the invitation is bound to the merchant here, server-side, and the
// link is only made later by consume_portal_invitation() for a signed-in user
// whose verified email matches the invited address.
//
// Refused when: the assessment is not reviewed yet, its merchant is unresolved,
// the latest decision for it is 'declined', or the merchant already has more
// than one linked account (ambiguous). A merchant with exactly one linked
// account needs no invitation and is reported as already linked.
//
// Idempotent: one open invitation per merchant; repeat calls re-attempt the same
// queued email and never issue a second, different link.
//
// Not covered by middleware.ts, so the admin gate is re-verified here.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { issuePortalInvitation } from '@/lib/portal-invitations'

export const dynamic = 'force-dynamic'

const MESSAGES: Record<string, string> = {
  not_reviewed: 'Complete the review before inviting this merchant to the portal.',
  no_merchant: 'This assessment is not linked to a merchant record yet. Resolve the merchant first.',
  declined: 'The current decision for this assessment is declined, so no portal invitation is sent.',
  merchant_email_unavailable: 'This merchant has no usable email address to invite.',
  client_link_ambiguous:
    'More than one portal account is linked to this merchant. Resolve that before inviting; nothing is merged automatically.',
  server_configuration: 'Invitations cannot be created: the server is missing its configuration.',
  write_failed: 'The invitation could not be saved. Nothing was sent — try again.',
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  const assessmentId = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(assessmentId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { data: assessment, error } = await db
      .from('growth_assessments')
      .select('id, merchant_id, reviewed_at')
      .eq('id', assessmentId)
      .maybeSingle()
    if (error) return queryFailure('invite read', error)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const refuse = (reason: string) =>
      NextResponse.json({ error: reason, message: MESSAGES[reason] ?? 'The invitation could not be sent.' }, { status: 409 })

    if (!assessment.merchant_id) return refuse('no_merchant')
    if (!assessment.reviewed_at) return refuse('not_reviewed')

    const { data: latest, error: decisionError } = await db
      .from('growth_program_decisions')
      .select('decision')
      .eq('assessment_id', assessmentId)
      .order('decision_seq', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (decisionError) return queryFailure('invite decision read', decisionError)
    if (latest?.decision === 'declined') return refuse('declined')

    const outcome = await issuePortalInvitation(db, {
      merchantId: assessment.merchant_id,
      actorId: userId,
      assessmentId,
    })
    if (!outcome.ok) return refuse(outcome.reason)
    if (outcome.state === 'already_linked') {
      return NextResponse.json({ success: true, state: 'already_linked' })
    }
    return NextResponse.json({ success: true, state: outcome.state, expiresAt: outcome.expiresAt })
  } catch (err) {
    return queryFailure('invite', err)
  }
}
