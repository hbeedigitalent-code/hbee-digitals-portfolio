// src/app/api/client-portal/project-requests/route.ts
//
// POST — submit a new project request for the CALLER's own CONNECTED client account.
//
// S6.2 changes (the request architecture itself is unchanged):
//   * CONNECTED ONLY. An account whose clients.merchant_id is null (or dangling) cannot create a request or a
//     project: it gets 403 { state: 'not_connected' } and nothing is written. A suspended account gets
//     403 { state: 'suspended' }. Both come from the shared resolver, so a direct POST cannot bypass the UI.
//   * RATE LIMITED per verified user, invisibly (portalRequest). 429 + Retry-After; no captcha.
//   * COLLISION-SAFE project reference (crypto-random, checked and retried) instead of PROJ-<Date.now()>.
//   * BEST-EFFORT ROLLBACK. There is still no database transaction (that needs a new RPC — see the S6.2
//     report). If the project insert fails, the request row this call just created is deleted again, scoped
//     to this client, so a failed submission leaves nothing half-made. If that cleanup also fails, the
//     response says so truthfully instead of claiming success.
//   * ADMIN NOTIFICATION on success, idempotent on the request id (createNotification dedupes on it).
//
// The body carries only { title, service, description }; a client_id, merchant id, status, progress or any
// other field in it is ignored. The client is derived from the verified session and from nothing else.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
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
    const { db: adminClient, client } = portal
    const clientId = client.id

    const limit = await checkRateLimit('portalRequest', `user:${portal.user.id}`)
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

    // 1. The request row. Only columns that exist on project_requests.
    const { data: requestRow, error: requestError } = await adminClient
      .from('project_requests')
      .insert({
        client_id: clientId,
        title: v.value.title,
        description: v.value.description,
        status: 'open',
      })
      .select('id')
      .single()

    if (requestError || !requestRow) {
      console.error('❌ [client-portal/project-requests] request insert failed')
      return NextResponse.json(
        { error: 'Failed to submit request. Please try again.', code: 'request_failed' },
        { status: 500 },
      )
    }

    // 2. The project record. `projects` is shared with the portfolio side, whose `title` is NOT NULL, while the
    // portal reads `project_name`: both get the same value, exactly as the form always did.
    let projectRow: { id: string } | null = null
    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS && !projectRow; attempt++) {
      const reference = generateProjectReference()

      const { data: clash, error: clashError } = await adminClient
        .from('projects')
        .select('id')
        .eq('project_id', reference)
        .limit(1)
      if (clashError) break
      if (clash && clash.length > 0) continue

      const { data, error } = await adminClient
        .from('projects')
        .insert({
          client_id: clientId,
          project_id: reference,
          title: v.value.title,
          project_name: v.value.title,
          status: 'Pending Review',
          progress: 0,
          description: v.value.description,
          service_selected: v.value.service,
          start_date: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (!error && data) {
        projectRow = data
      } else if ((error as { code?: string } | null)?.code !== UNIQUE_VIOLATION) {
        break
      }
    }

    if (!projectRow) {
      console.error('❌ [client-portal/project-requests] project insert failed')
      // Roll the request row back, scoped to this client and to the row this call created.
      const { error: rollbackError } = await adminClient
        .from('project_requests')
        .delete()
        .eq('id', requestRow.id)
        .eq('client_id', clientId)

      if (rollbackError) {
        console.error('⚠️ [client-portal/project-requests] request rollback failed')
        return NextResponse.json(
          {
            error:
              'Your request was saved, but we could not create the project record. Please contact support so we can finish setting it up.',
            code: 'project_failed',
          },
          { status: 500 },
        )
      }
      return NextResponse.json(
        { error: 'We could not submit your request. Nothing was saved. Please try again.', code: 'project_failed' },
        { status: 500 },
      )
    }

    // 3. Back-reference from the request to its project (best effort, as before).
    const { error: linkError } = await adminClient
      .from('project_requests')
      .update({ project_id: projectRow.id })
      .eq('id', requestRow.id)
      .eq('client_id', clientId)

    if (linkError) {
      console.error('⚠️ [client-portal/project-requests] request->project link failed')
    }

    // 4. Tell Admin. A failure here never fails the request the client has already made.
    const who = String(client.business_name || client.full_name || 'A client').trim()
    const notification = await createNotification({
      scope: 'admin',
      recipientId: null,
      type: 'project_request_created',
      title: 'New project request',
      message: `${who} requested "${v.value.title}" (${v.value.service})`.slice(0, 300),
      entityType: 'project_request',
      entityId: requestRow.id,
      link: `/admin/projects/${projectRow.id}`,
    })
    if (!notification.ok) {
      console.error(
        `⚠️ [client-portal/project-requests] admin notification not created (${notification.skipped ?? 'unknown'})`,
      )
    }

    return NextResponse.json({ ok: true, linkWarning: !!linkError })
  } catch (error) {
    console.error('❌ Client project request error:', error)
    return NextResponse.json({ error: 'Failed to submit request. Please try again.' }, { status: 500 })
  }
}
