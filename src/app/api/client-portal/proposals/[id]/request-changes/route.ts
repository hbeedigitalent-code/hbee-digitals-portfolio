// src/app/api/client-portal/proposals/[id]/request-changes/route.ts
//
// POST — the client asks for changes to the proposal they were sent. Body: { reason, clientKey? }.
//
// S6.4: the reason is now a DURABLE record. request_proposal_changes stores it in proposal_responses against the exact VERSION
// the client was looking at, in the same transaction as the status change to `changes_requested` (an immutable row; it can only
// ever be marked resolved when the Admin sends the next version). It is no longer carried only in a notification.
//
// Allowed from sent / viewed only, for the client's own proposal (anything else is the same 404). `clientKey` makes a retry
// return the first record instead of a second; the Admin notification is keyed on that record, so a retry cannot duplicate it.
// Only `reason` and `clientKey` are read from the body.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { callRpc, refusal, UUID_RE } from '@/lib/commerce/rpc'
import { notifyAdminProposalDecision } from '@/lib/commerce/notify'

export const dynamic = 'force-dynamic'

const MAX_REASON_LENGTH = 2000
const KEY_RE = /^[A-Za-z0-9_-]{8,80}$/

/** Strips control characters and collapses runaway whitespace; tab and newline survive so a multi-paragraph request is intact. */
function sanitizeReason(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient({ requireConnected: true, extraColumns: 'business_name, full_name' })
    if (!portal.ok) return portal.response
    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    const reason = sanitizeReason(typeof body?.reason === 'string' ? body.reason : '')
    if (!reason) return NextResponse.json({ error: 'Please tell us what you would like changed.' }, { status: 400 })
    if (reason.length > MAX_REASON_LENGTH) return NextResponse.json({ error: `Please keep your message under ${MAX_REASON_LENGTH} characters.` }, { status: 400 })
    const key = typeof body?.clientKey === 'string' && KEY_RE.test(body.clientKey) ? body.clientKey : null

    const result = await callRpc(portal.db, 'request_proposal_changes', { p_proposal_id: proposalId, p_client_id: portal.client.id, p_user_id: portal.user.id, p_reason: reason, p_key: key })
    if (!result.ok) return result.response
    const refused = refusal(result.outcome, ['requested'])
    if (refused) return refused
    const o = result.outcome

    let notified = false
    if (o.duplicate !== true) {
      const label = String(portal.client.business_name || portal.client.full_name || 'A client')
      notified = await notifyAdminProposalDecision({ kind: 'changes_requested', proposalId, entityId: String(o.response_id), clientLabel: label, number: String(o.proposal_number ?? ''), reasonPreview: reason.slice(0, 300) })
    }
    return NextResponse.json({ success: true, duplicate: o.duplicate === true, notified })
  } catch (error) {
    console.error('❌ Client request-changes error:', error)
    return NextResponse.json({ error: 'Failed to send your request' }, { status: 500 })
  }
}
