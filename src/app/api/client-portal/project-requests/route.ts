// src/app/api/client-portal/project-requests/route.ts
//
// POST — submit a new project request for the CALLER's own CONNECTED client account.
//
// S6.3: ATOMIC. The request row, the project row, the link between them and the first activity events are
// created by ONE database function (create_portal_request, scripts/requests-projects-01-forward.sql) inside one
// transaction — they all exist or none does. This replaces the S6.2 insert / insert / compensating-delete
// sequence, which could leave a request without a project if the cleanup itself failed.
//
// What stays exactly as in S6.2:
//   * the client is derived from the verified session through the shared resolver, never from the body;
//   * connected-only (403 not_connected) and suspended (403 account_suspended) come from the resolver, and the
//     database function re-checks both, so a direct call cannot bypass them;
//   * per-user rate limit (portalRequest), 429 + Retry-After, no captcha;
//   * collision-safe project reference — a duplicate reference makes the function raise 23505 and roll back
//     EVERYTHING, and this route retries with a fresh reference;
//   * the Admin notification, outside the transaction on purpose (see below).
//
// WHY THE NOTIFICATION IS NOT IN THE TRANSACTION. Delivery depends on the notifications table and the outbox
// and must never be able to roll back a client's request. It is created after the commit and is idempotent on
// the request id (createNotification's key is type + entity + scope), so a retried POST that reaches this line
// twice produces one notification, and a failed notification never fails the request.
//
// The body carries only { title, service, description }; a client_id, merchant id, status, progress or any other
// field in it is ignored.

import { NextResponse } from 'next/server'
import {
  resolvePortalClient,
  PORTAL_NOT_CONNECTED_BODY,
  PORTAL_SUSPENDED_BODY,
} from '@/lib/client-portal/portal-client'
import { validateProjectRequest } from '@/lib/client-portal/project-request'
import { generateProjectReference } from '@/lib/projects/project-reference'
import { createNotification } from '@/lib/notifications/createNotification'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_REFERENCE_ATTEMPTS = 5
const UNIQUE_VIOLATION = '23505'

export async function POST(request: Request) {
  try {
    const portal = await resolvePortalClient({
      requireConnected: true,
      extraColumns: 'business_name, full_name',
      failureMessage: 'Failed to submit request. Please try again.',
    })
    if (!portal.ok) return portal.response
    const { db, client, user } = portal

    const limit = await checkRateLimit('portalRequest', `user:${user.id}`)
    if (!limit.ok) {
      return NextResponse.json(
        {
          code: 'rate_limited',
          error: 'You have sent several requests in a short time. Please wait a little before sending another.',
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) } },
      )
    }

    const body = await request.json().catch(() => null)
    const v = validateProjectRequest(body)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

    let created: { request_id: string; project_id: string } | null = null
    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS && !created; attempt++) {
      const { data, error } = await db.rpc('create_portal_request', {
        p_client_id: client.id,
        p_actor_user_id: user.id,
        p_title: v.value.title,
        p_description: v.value.description,
        p_service: v.value.service,
        p_reference: generateProjectReference(),
      })

      if (error) {
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) continue // reference clash: nothing was kept
        console.error(`[client-portal/project-requests] create_portal_request failed (code=${(error as { code?: string }).code ?? 'n/a'})`)
        return NextResponse.json({ error: 'Failed to submit request. Please try again.', code: 'request_failed' }, { status: 500 })
      }

      const outcome = (data || {}) as { status?: string; request_id?: string; project_id?: string }
      if (outcome.status === 'created' && outcome.request_id && outcome.project_id) {
        created = { request_id: outcome.request_id, project_id: outcome.project_id }
      } else if (outcome.status === 'suspended') {
        return NextResponse.json(PORTAL_SUSPENDED_BODY, { status: 403 })
      } else if (outcome.status === 'not_connected') {
        return NextResponse.json(PORTAL_NOT_CONNECTED_BODY, { status: 403 })
      } else {
        return NextResponse.json({ error: 'Failed to submit request. Please try again.', code: 'request_failed' }, { status: 500 })
      }
    }

    if (!created) {
      console.error('[client-portal/project-requests] could not allocate a unique project reference')
      return NextResponse.json({ error: 'We could not submit your request. Nothing was saved. Please try again.', code: 'request_failed' }, { status: 500 })
    }

    const who = String(client.business_name || client.full_name || 'A client').trim()
    const notification = await createNotification({
      scope: 'admin',
      recipientId: null,
      type: 'project_request_created',
      title: 'New project request',
      message: `${who} requested "${v.value.title}" (${v.value.service})`.slice(0, 300),
      entityType: 'project_request',
      entityId: created.request_id,
      link: `/admin/requests/${created.request_id}`,
    })
    if (!notification.ok) {
      console.error(`⚠️ [client-portal/project-requests] admin notification not created (${notification.skipped ?? 'unknown'})`)
    }

    return NextResponse.json({ ok: true, requestId: created.request_id })
  } catch (error) {
    console.error('❌ Client project request error:', error)
    return NextResponse.json({ error: 'Failed to submit request. Please try again.' }, { status: 500 })
  }
}
