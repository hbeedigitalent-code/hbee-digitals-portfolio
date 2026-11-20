// src/app/api/client-portal/proposals/[id]/viewed/route.ts
//
// POST — the client has opened their own proposal: sent -> viewed, once. mark_proposal_viewed matches the proposal to the
// caller's client id inside the function, so another client's id changes nothing and says nothing. Idempotent. The body is ignored.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { callRpc, UUID_RE } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient({ requireConnected: true })
    if (!portal.ok) return portal.response
    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const result = await callRpc(portal.db, 'mark_proposal_viewed', { p_proposal_id: id, p_client_id: portal.client.id })
    if (!result.ok) return result.response
    if (result.outcome.status === 'not_found') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, status: result.outcome.status })
  } catch (error) {
    console.error('❌ Client proposal viewed error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
