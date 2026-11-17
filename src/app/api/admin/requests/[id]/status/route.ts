// src/app/api/admin/requests/[id]/status/route.ts
//
// POST — Admin sets a request's status: { status: 'open' | 'in_review' | 'answered' | 'closed' }.
// set_request_status is the only status writer; it records a client-visible activity event and returns its id,
// which keys the client notification so a retry of the SAME change cannot notify twice while a genuinely later
// change (a different event) still does.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { isRequestStatus, REQUEST_STATUS_LABELS } from '@/lib/requests/request-status'
import { changeRequestStatus } from '@/lib/requests/request-service'
import { createNotification } from '@/lib/notifications/createNotification'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  const requestId = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(requestId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await request.json().catch(() => null)
    if (!body || !isRequestStatus(body.status)) return NextResponse.json({ error: 'Choose a valid status.' }, { status: 400 })

    const result = await changeRequestStatus(db, { requestId, clientId: null, userId, role: 'admin', status: body.status })
    if (!result.ok) return result.response

    if (result.outcome.status === 'changed' && result.outcome.event_id) {
      const { data: req } = await db.from('project_requests').select('client_id, title').eq('id', requestId).maybeSingle()
      if (req?.client_id) {
        await createNotification({
          scope: 'client',
          recipientId: req.client_id,
          type: 'request_status_changed',
          title: 'Your request was updated',
          message: `"${String(req.title || 'Request').slice(0, 120)}" is now ${REQUEST_STATUS_LABELS[body.status as keyof typeof REQUEST_STATUS_LABELS].toLowerCase()}`,
          entityType: 'activity_event',
          entityId: result.outcome.event_id,
          link: `/client-portal/requests/${requestId}`,
        })
      }
    }
    return NextResponse.json({ ok: true, status: result.outcome.request_status, changed: result.outcome.status === 'changed' })
  } catch (error) {
    console.error('❌ Admin request status error:', error)
    return NextResponse.json({ error: 'The status could not be changed.' }, { status: 500 })
  }
}
