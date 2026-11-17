// src/app/api/client-portal/requests/[id]/messages/route.ts
//
// POST — the CALLER (a connected, active client) replies on ONE of their own requests.
//
// Identity: resolvePortalClient({ requireConnected: true }) — 401 / 403 suspended / 403 not_connected exactly as
// everywhere else in S6.2. The author role is the constant 'client' written HERE; the body is parsed with
// allowInternal:false and only { body, clientKey, attachmentFileId } is ever copied out of it, so an
// author_role, client_id, user_id or is_internal field in the request is ignored.
//
// Ownership and the status transition happen inside post_request_message (one transaction); a request of
// another client answers 404 from there as well. clientKey makes a retried POST return the first message
// instead of creating a second one, and the notification is idempotent on the message id.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { parseMessageBody } from '@/lib/requests/thread-validation'
import { postRequestMessage, notifyAfterMessage, UUID_RE } from '@/lib/requests/request-service'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient({ requireConnected: true })
    if (!portal.ok) return portal.response
    const { db, user, client } = portal

    const requestId = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(requestId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const limit = await checkRateLimit('portalReply', `user:${user.id}`)
    if (!limit.ok) {
      return NextResponse.json(
        { code: 'rate_limited', error: 'You are sending messages quickly. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) } },
      )
    }

    const parsed = parseMessageBody(await request.json().catch(() => null), { allowInternal: false })
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const result = await postRequestMessage(db, {
      requestId,
      clientId: client.id,
      userId: user.id,
      role: 'client',
      body: parsed.value.body,
      internal: false,
      attachmentFileId: parsed.value.attachmentFileId,
      clientKey: parsed.value.clientKey,
    })
    if (!result.ok) return result.response

    const { data: reqRow } = await db.from('project_requests').select('title').eq('id', requestId).eq('client_id', client.id).maybeSingle()
    await notifyAfterMessage({
      role: 'client',
      internal: false,
      requestId,
      clientId: client.id,
      messageId: result.outcome.message_id as string,
      requestTitle: String(reqRow?.title || 'your request'),
      duplicate: result.outcome.duplicate === true,
    })

    return NextResponse.json({ ok: true, messageId: result.outcome.message_id, status: result.outcome.request_status })
  } catch (error) {
    console.error('❌ Client request reply error:', error)
    return NextResponse.json({ error: 'Your message could not be sent. Please try again.' }, { status: 500 })
  }
}
