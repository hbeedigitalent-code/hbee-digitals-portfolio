// src/app/api/client-portal/requests/[id]/read/route.ts
//
// POST — mark the CALLER's unread Hbee replies on ONE of their own requests as read. Scoped by the client id
// from the session inside mark_request_read; another client's request id changes nothing and says nothing
// (always { ok: true, marked: 0 }). Allowed for unconnected/suspended-agnostic reads is NOT assumed: it uses
// the standard resolver, so a suspended account is refused like every other route.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { UUID_RE } from '@/lib/requests/request-service'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const requestId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(requestId)) return NextResponse.json({ ok: true, marked: 0 })

    const { data, error } = await portal.db.rpc('mark_request_read', {
      p_request_id: requestId,
      p_client_id: portal.client.id,
      p_reader_role: 'client',
    })
    if (error) return NextResponse.json({ ok: true, marked: 0 })
    return NextResponse.json({ ok: true, marked: typeof data === 'number' ? data : 0 })
  } catch {
    return NextResponse.json({ ok: true, marked: 0 })
  }
}
