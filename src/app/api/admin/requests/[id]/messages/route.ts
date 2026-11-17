// src/app/api/admin/requests/[id]/messages/route.ts
//
// POST — Admin replies to the client (internal:false) or leaves an INTERNAL NOTE (internal:true).
//
// The author role is the constant 'admin' written here; the author id is the verified admin's user id. An
// internal note never changes the request's status, never notifies the client and is stored with
// is_internal = true, which the client routes filter out in their database queries. A public reply moves an
// open / in_review request to answered (inside post_request_message) and notifies the client, idempotently on
// the message id.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { parseMessageBody } from '@/lib/requests/thread-validation'
import { postRequestMessage, notifyAfterMessage } from '@/lib/requests/request-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  const requestId = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(requestId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const parsed = parseMessageBody(await request.json().catch(() => null), { allowInternal: true })
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { data: req } = await db.from('project_requests').select('id, client_id, title').eq('id', requestId).maybeSingle()
    if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const result = await postRequestMessage(db, {
      requestId,
      clientId: null,
      userId,
      role: 'admin',
      body: parsed.value.body,
      internal: parsed.value.internal,
      attachmentFileId: parsed.value.attachmentFileId,
      clientKey: parsed.value.clientKey,
    })
    if (!result.ok) return result.response

    await notifyAfterMessage({
      role: 'admin',
      internal: parsed.value.internal,
      requestId,
      clientId: req.client_id,
      messageId: result.outcome.message_id as string,
      requestTitle: String(req.title || 'your request'),
      duplicate: result.outcome.duplicate === true,
    })

    return NextResponse.json({ ok: true, messageId: result.outcome.message_id, status: result.outcome.request_status })
  } catch (error) {
    console.error('❌ Admin request reply error:', error)
    return NextResponse.json({ error: 'Your message could not be sent. Please try again.' }, { status: 500 })
  }
}
