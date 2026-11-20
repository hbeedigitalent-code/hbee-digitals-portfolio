// src/app/api/client-portal/proposals/[id]/route.ts
//
// GET — one proposal, but only if it belongs to the CALLER's own client account and has been delivered.
//
// The commercial content is the immutable VERSION SNAPSHOT the client was sent (the approved version once approved) — never the
// live draft rows — so what is shown is exactly what can be approved. A draft, another client's proposal, a malformed id and an
// unknown id all answer the SAME 404 (no enumeration). Attachment metadata comes from proposal_files without object paths;
// downloads go only through the signed-url route. The client's OWN change-request / decline messages are returned; the Admin's
// internal notes, merchant id, client id, created_by and every other internal column are never selected.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { loadProposalView } from '@/lib/commerce/documents'
import { UUID_RE } from '@/lib/commerce/rpc'
import { isProposalExpired } from '@/lib/client-portal/proposal-display'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const proposalId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(proposalId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const loaded = await loadProposalView(portal.db, proposalId, { clientId: portal.client.id })
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { view } = loaded

    const [filesRes, responsesRes] = await Promise.all([
      portal.db.from('proposal_files').select('id, proposal_id, file_name, file_type, file_size, uploaded_at').eq('proposal_id', proposalId).order('uploaded_at', { ascending: false }),
      portal.db.from('proposal_responses').select('id, version_number, response_type, message, created_at, resolved_at, resolved_in_version').eq('proposal_id', proposalId).eq('client_id', portal.client.id).order('created_at', { ascending: true }),
    ])

    const expired = isProposalExpired({ status: view.status, expires_at: view.expiresAt })
    const decidable = (view.status === 'sent' || view.status === 'viewed') && !expired
    return NextResponse.json({
      proposal: { ...view, clientId: undefined, merchantId: undefined, isDraftPreview: undefined },
      files: filesRes.data || [],
      responses: responsesRes.data || [],
      canDecide: decidable,
      expired,
    })
  } catch (error) {
    console.error('❌ Client proposal detail error:', error)
    return NextResponse.json({ error: 'Failed to load proposal' }, { status: 500 })
  }
}
