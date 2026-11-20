// src/app/api/client-portal/proposals/[id]/approve/route.ts
//
// POST — the client approves ONE specific VERSION of their own proposal.
//
// Body: { version: <number the client reviewed>, confirm: true }. Both are required: approval is an explicit confirmation of a
// named version, so a stale page cannot approve a newer text and a stray request cannot approve at all. Nothing else is read —
// not a client id, merchant id, project id, status, total or user id.
//
// ONE database function (approve_proposal) does the whole operation in a single transaction, under a row lock:
//   * the proposal must belong to the session's client (anything else is the same 404);
//   * the account must be connected and not suspended; the status must be sent or viewed (NEVER changes_requested);
//   * the confirmed version must equal the current one; an expired proposal is refused;
//   * it records the approved version, the approving user and the time;
//   * it reuses the proposal's valid same-client project, or creates exactly one `Pending Review` client project and links it;
//   * a repeat of the same approval changes nothing and returns the same project.
// A duplicate project reference rolls the function back whole and is retried here with a fresh reference.
//
// After the commit: one Admin notification (keyed on the proposal, so a retry cannot duplicate it) and the merchant lifecycle
// step, both best effort — neither can undo or fail the client's decision.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { callRpcWithProjectReference, refusal, UUID_RE } from '@/lib/commerce/rpc'
import { notifyAdminProposalDecision } from '@/lib/commerce/notify'

export const dynamic = 'force-dynamic'

const ACCEPTED_LIFECYCLE_STATUS = 'proposal_accepted'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient({ requireConnected: true, extraColumns: 'business_name, full_name' })
    if (!portal.ok) return portal.response
    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    const version = Number(body?.version)
    if (body?.confirm !== true || !Number.isInteger(version) || version < 1 || version > 10000) {
      return NextResponse.json({ error: 'Confirm the version you are approving.', code: 'confirmation_required' }, { status: 400 })
    }

    const result = await callRpcWithProjectReference(portal.db, 'approve_proposal', {
      p_proposal_id: proposalId,
      p_client_id: portal.client.id,
      p_user_id: portal.user.id,
      p_confirm_version: version,
    })
    if (!result.ok) return result.response
    const refused = refusal(result.outcome, ['approved', 'already_approved'])
    if (refused) return refused
    const o = result.outcome

    let notified = false
    if (o.status === 'approved') {
      const label = String(portal.client.business_name || portal.client.full_name || 'A client')
      notified = await notifyAdminProposalDecision({ kind: 'approved', proposalId, entityId: proposalId, clientLabel: label, number: String(o.proposal_number ?? '') })

      // merchant lifecycle: a SEPARATE table, best effort, exactly as the previous Admin approval did
      const merchantId = portal.client.merchant_id
      if (merchantId) {
        const now = new Date().toISOString()
        const { error } = await portal.db.from('merchant_status').update({ status: ACCEPTED_LIFECYCLE_STATUS, current_stage: ACCEPTED_LIFECYCLE_STATUS, last_activity: now, updated_at: now }).eq('merchant_id', merchantId)
        if (error) console.error('⚠️ Proposal approved but the merchant lifecycle update failed')
      }
    }
    return NextResponse.json({ success: true, alreadyApproved: o.status === 'already_approved', version: o.version, projectId: o.project_id ?? null, notified })
  } catch (error) {
    console.error('❌ Client proposal approve error:', error)
    return NextResponse.json({ error: 'Failed to approve proposal' }, { status: 500 })
  }
}
