// src/app/api/client-portal/requests/[id]/status/route.ts
//
// POST — the client confirms an ANSWERED request is resolved. This is the only status change a client may make;
// the rule is enforced inside set_request_status (answered -> closed, own request only), not here, so it cannot
// be bypassed by editing this file's checks away. The body's `status` is accepted only to be validated: any
// value other than 'closed' is refused before the database is called.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { changeRequestStatus, UUID_RE } from '@/lib/requests/request-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient({ requireConnected: true })
    if (!portal.ok) return portal.response
    const { db, user, client } = portal

    const requestId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(requestId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body || body.status !== 'closed') return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

    const result = await changeRequestStatus(db, { requestId, clientId: client.id, userId: user.id, role: 'client', status: 'closed' })
    if (!result.ok) return result.response
    return NextResponse.json({ ok: true, status: result.outcome.request_status })
  } catch (error) {
    console.error('❌ Client request status error:', error)
    return NextResponse.json({ error: 'The status could not be changed.' }, { status: 500 })
  }
}
