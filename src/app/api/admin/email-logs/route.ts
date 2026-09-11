// src/app/api/admin/email-logs/route.ts
//
// GET — the email delivery log, for active, 2FA-verified admins only.
//
// WHY THIS ROUTE EXISTS. /admin/email-logs used to query email_logs straight
// from the browser with the anon client. The only policy on that table was
// "Allow authenticated manage email logs" — ALL to authenticated, USING true,
// WITH CHECK true — so EVERY signed-in user, including every ordinary client,
// could read, insert, update and delete every row: recipient addresses,
// subjects and provider error text for the whole business. The accompanying
// migration replaces that policy with server-only access, which necessarily
// breaks the browser query; this route is its replacement, and the page is
// updated in the same batch.
//
// The custom admin 2FA cookie is verified by the APPLICATION, not the database.
// No RLS policy can see it. That is precisely why the table's own policy is
// being reduced to nothing and the read is being moved behind this gate: an
// `admin_users`-membership policy would still let a logged-in admin's browser
// read the table without ever passing 2FA.
//
// Not covered by middleware.ts (matcher: /admin/:path*, /admin-2fa-challenge,
// /client-portal/:path*), so the gate is re-verified here.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

// Explicit allow-list. `related_inquiry_id` and `sent_by` are internal joins
// with no display use here and are deliberately not selected.
const LOG_COLUMNS =
  'id, template_slug, recipient_email, recipient_name, subject, status, ' +
  'delivery_state, delivery_recorded_at, resend_id, error_message, created_at'

const STATUS_FILTERS = ['all', 'accepted', 'failed', 'legacy'] as const

export async function GET(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db } = auth

  try {
    const url = new URL(request.url)

    const parsedLimit = Number.parseInt(url.searchParams.get('limit') || '', 10)
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT

    const requestedStatus = url.searchParams.get('status') || 'all'
    const status = (STATUS_FILTERS as readonly string[]).includes(requestedStatus)
      ? requestedStatus
      : 'all'

    let query = db
      .from('email_logs')
      .select(LOG_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit)

    // delivery_state is the authoritative field. A row with a NULL
    // delivery_state predates delivery tracking — nothing ever wrote its
    // `status` deliberately — so it is reported as 'legacy' rather than dressed
    // up as an outcome. 'accepted' means the provider TOOK the message; it is
    // not delivery confirmation.
    if (status === 'failed') {
      query = query.in('delivery_state', ['failed', 'configuration_error'])
    }
    if (status === 'accepted') query = query.eq('delivery_state', 'accepted')
    if (status === 'legacy') query = query.is('delivery_state', null)

    const { data, error } = await query
    if (error) return queryFailure('email log list', error)

    const logs = data || []

    return NextResponse.json({
      logs,
      stats: {
        total: logs.length,
        accepted: logs.filter((r: any) => r.delivery_state === 'accepted').length,
        failed: logs.filter(
          (r: any) => r.delivery_state === 'failed' || r.delivery_state === 'configuration_error',
        ).length,
        legacy: logs.filter((r: any) => !r.delivery_state).length,
      },
    })
  } catch (error) {
    return queryFailure('email log list', error)
  }
}
