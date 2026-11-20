// src/app/api/admin/proposals/[id]/status/route.ts
//
// POST — the trusted server-side proposal SEND (and RE-SEND of a revision).
//
// S6.4 narrows this route to the one transition an Admin owns. Viewing, approving, requesting changes and declining are CLIENT
// decisions: they are recorded by the database functions with the client's own identity, so the old Admin "approve" branch
// (which let an Admin approve on a client's behalf, from the browser or here) is gone and a request for any other status is a 400.
//
// send_proposal does everything in one transaction: it recomputes the totals from the line items, snapshots the exact content as
// an immutable VERSION (a re-send after "changes requested" is version N+1), resolves the open change requests, and records the
// event. The client notification is keyed on that VERSION, so a revision notifies and a retried send does not.
// Nothing commercial or identity-bearing is read from the body: only `status` is consumed.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { callRpc, refusal } from '@/lib/commerce/rpc'
import { notifyProposalSent } from '@/lib/commerce/notify'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || body.status !== 'sent') {
      return NextResponse.json(
        { error: 'Admins can only send a proposal. Approval, changes and declining are the client’s decisions.', code: 'transition_not_available' },
        { status: 400 },
      )
    }

    const result = await callRpc(auth.db, 'send_proposal', { p_proposal_id: id, p_actor: auth.userId })
    if (!result.ok) return result.response
    const refused = refusal(result.outcome, ['sent'])
    if (refused) return refused
    const o = result.outcome

    const notified = await notifyProposalSent({
      clientId: String(o.client_id), proposalId: id, versionId: String(o.version_id), number: String(o.proposal_number ?? ''), title: String(o.title ?? ''),
      revised: o.revised === true, version: Number(o.version),
    })
    return NextResponse.json({ success: true, proposal: { id, status: 'sent', version: o.version, revised: o.revised === true }, notified })
  } catch (error) {
    console.error('❌ Admin proposal send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
