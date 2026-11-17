// src/lib/requests/request-service.ts
//
// SERVER-ONLY. The shared implementation behind the Portal and Admin request routes, so the rules cannot
// drift between the two sides. Every function receives an ALREADY-RESOLVED identity (from
// resolvePortalClient or requireActiveAdmin) and passes it to the database functions explicitly; nothing here
// reads a role, client id or user id from a request.

import { NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications/createNotification'

if (typeof window !== 'undefined') {
  throw new Error('request-service.ts is server-only and must not be imported by client code')
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface PostMessageInput {
  requestId: string
  /** The request's owning client for a CLIENT caller; null for Admin. */
  clientId: string | null
  userId: string
  role: 'client' | 'admin'
  body: string
  internal: boolean
  attachmentFileId: string | null
  clientKey: string | null
}

export interface RpcOutcome {
  status: string
  message_id?: string
  request_status?: string
  previous_status?: string
  duplicate?: boolean
  event_id?: string
}

export async function postRequestMessage(db: any, i: PostMessageInput): Promise<{ ok: true; outcome: RpcOutcome } | { ok: false; response: NextResponse }> {
  const { data, error } = await db.rpc('post_request_message', {
    p_request_id: i.requestId,
    p_client_id: i.clientId,
    p_author_user_id: i.userId,
    p_author_role: i.role,
    p_body: i.body,
    p_internal: i.role === 'admin' ? i.internal : false,
    p_attachment_file_id: i.attachmentFileId,
    p_client_key: i.clientKey,
  })
  if (error) {
    console.error(`[requests] post_request_message failed (code=${(error as { code?: string }).code ?? 'n/a'})`)
    return { ok: false, response: NextResponse.json({ error: 'Your message could not be sent. Please try again.' }, { status: 500 }) }
  }
  const outcome = (data || {}) as RpcOutcome
  switch (outcome.status) {
    case 'posted':
      return { ok: true, outcome }
    case 'not_found':
      return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
    case 'closed':
      return {
        ok: false,
        response: NextResponse.json(
          { code: 'request_closed', error: 'This request is closed. Start a new request if you need something else.' },
          { status: 409 },
        ),
      }
    case 'invalid_attachment':
      return { ok: false, response: NextResponse.json({ error: 'That attachment is not available.' }, { status: 400 }) }
    default:
      return { ok: false, response: NextResponse.json({ error: 'Your message could not be sent.' }, { status: 400 }) }
  }
}

/** Tell the other side. Never throws; a failed notification never fails the message. Idempotent on message id. */
export async function notifyAfterMessage(opts: {
  role: 'client' | 'admin'
  internal: boolean
  requestId: string
  clientId: string
  messageId: string
  requestTitle: string
  duplicate: boolean
}): Promise<void> {
  if (opts.duplicate || opts.internal) return
  const title = opts.requestTitle.slice(0, 120)
  if (opts.role === 'client') {
    await createNotification({
      scope: 'admin',
      recipientId: null,
      type: 'request_client_reply',
      title: 'Client replied to a request',
      message: `New reply on "${title}"`.slice(0, 300),
      entityType: 'thread_message',
      entityId: opts.messageId,
      link: `/admin/requests/${opts.requestId}`,
    })
  } else {
    await createNotification({
      scope: 'client',
      recipientId: opts.clientId,
      type: 'request_admin_reply',
      title: 'Hbee replied to your request',
      message: `There is a new reply on "${title}"`.slice(0, 300),
      entityType: 'thread_message',
      entityId: opts.messageId,
      link: `/client-portal/requests/${opts.requestId}`,
    })
  }
}

export async function changeRequestStatus(
  db: any,
  i: { requestId: string; clientId: string | null; userId: string; role: 'client' | 'admin'; status: string },
): Promise<{ ok: true; outcome: RpcOutcome } | { ok: false; response: NextResponse }> {
  const { data, error } = await db.rpc('set_request_status', {
    p_request_id: i.requestId,
    p_client_id: i.clientId,
    p_actor_user_id: i.userId,
    p_actor_role: i.role,
    p_new_status: i.status,
  })
  if (error) {
    console.error(`[requests] set_request_status failed (code=${(error as { code?: string }).code ?? 'n/a'})`)
    return { ok: false, response: NextResponse.json({ error: 'The status could not be changed.' }, { status: 500 }) }
  }
  const outcome = (data || {}) as RpcOutcome
  if (outcome.status === 'changed' || outcome.status === 'unchanged') return { ok: true, outcome }
  if (outcome.status === 'not_found') return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  if (outcome.status === 'not_allowed') {
    return { ok: false, response: NextResponse.json({ code: 'transition_not_allowed', error: 'That change is not available for this request.' }, { status: 409 }) }
  }
  return { ok: false, response: NextResponse.json({ error: 'The status could not be changed.' }, { status: 400 }) }
}
