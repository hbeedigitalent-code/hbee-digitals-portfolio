// src/app/api/client-portal/proposals/[id]/decline/route.ts
//
// POST — the client declines their own proposal. Body: { confirm: true, note? } (an optional short reason, up to 2000 characters).
// Explicit confirmation is required. decline_proposal records the decision and the note against the exact version in one
// transaction; a repeat is a harmless no-op. Allowed from sent / viewed only. Declined is terminal: Hbee would send a NEW
// proposal. One Admin notification, keyed on the proposal.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { callRpc, refusal, UUID_RE } from '@/lib/commerce/rpc'
import { notifyAdminProposalDecision } from '@/lib/commerce/notify'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient({ requireConnected: true, extraColumns: 'business_name, full_name' })
    if (!portal.ok) return portal.response
    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (body?.confirm !== true) return NextResponse.json({ error: 'Confirm that you want to decline this proposal.', code: 'confirmation_required' }, { status: 400 })
    // eslint-disable-next-line no-control-regex
    const note = typeof body?.note === 'string' ? body.note.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').replace(/\r\n?/g, '\n').trim() : ''
    if (note.length > 2000) return NextResponse.json({ error: 'Please keep your note under 2000 characters.' }, { status: 400 })

    const result = await callRpc(portal.db, 'decline_proposal', { p_proposal_id: proposalId, p_client_id: portal.client.id, p_user_id: portal.user.id, p_note: note || null, p_key: null })
    if (!result.ok) return result.response
    const refused = refusal(result.outcome, ['declined'])
    if (refused) return refused
    const o = result.outcome

    let notified = false
    if (o.duplicate !== true) {
      const label = String(portal.client.business_name || portal.client.full_name || 'A client')
      notified = await notifyAdminProposalDecision({ kind: 'declined', proposalId, entityId: proposalId, clientLabel: label, number: String(o.proposal_number ?? ''), reasonPreview: note ? note.slice(0, 300) : undefined })
    }
    return NextResponse.json({ success: true, duplicate: o.duplicate === true, notified })
  } catch (error) {
    console.error('❌ Client proposal decline error:', error)
    return NextResponse.json({ error: 'Failed to decline this proposal' }, { status: 500 })
  }
}
