// src/app/api/admin/clients/[client_id]/status/route.ts
//
// POST — suspend or reactivate a Portal account, for an authenticated, 2FA-verified, active admin.
//
// Uses the EXISTING clients.status column. 'Active' is the normal value every account has today; 'Suspended' is
// the one new value. Every Portal API reads that column through the shared resolver
// (src/lib/client-portal/portal-client.ts), so suspension takes effect on the very next request and cannot be
// bypassed by calling an API directly. The Auth user is not touched: login, password and email are unchanged,
// and reactivation restores everything exactly as it was (nothing is deleted).
//
// If the live database has a CHECK constraint on clients.status that rejects 'Suspended', this route returns a
// clear 409 instead of pretending it worked. The migration that would permit it is proposed, not run, in the
// S6.2 report.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { CLIENT_STATUS_ACTIVE, CLIENT_STATUS_SUSPENDED, isClientSuspended } from '@/lib/client-portal/portal-client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { client_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  try {
    const clientId = typeof params?.client_id === 'string' ? params.client_id.trim() : ''
    if (!ADMIN_UUID_RE.test(clientId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' ? body.action : ''
    if (action !== 'suspend' && action !== 'reactivate') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { data: current, error: readError } = await db
      .from('clients')
      .select('id, status')
      .eq('id', clientId)
      .maybeSingle()
    if (readError) return queryFailure('client status read', readError)
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const target = action === 'suspend' ? CLIENT_STATUS_SUSPENDED : CLIENT_STATUS_ACTIVE
    const alreadySuspended = isClientSuspended(current.status)
    if ((action === 'suspend' && alreadySuspended) || (action === 'reactivate' && !alreadySuspended)) {
      return NextResponse.json({ success: true, changed: false, status: current.status ?? CLIENT_STATUS_ACTIVE })
    }

    const { data: updated, error: updateError } = await db
      .from('clients')
      .update({ status: target, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .select('id, status')
      .maybeSingle()

    if (updateError) {
      const code = (updateError as { code?: string }).code
      console.error(`[admin-api] client status change failed (code=${code ?? 'n/a'})`)
      if (code === '23514') {
        return NextResponse.json(
          {
            error: 'status_value_not_permitted',
            message:
              'The database does not currently permit the status "Suspended" on clients. A reviewed migration is required first.',
          },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: 'Failed to change the account status' }, { status: 500 })
    }
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    console.log(`[admin-api] client ${clientId} ${action === 'suspend' ? 'suspended' : 'reactivated'} by admin ${userId}`)
    return NextResponse.json({ success: true, changed: true, status: updated.status })
  } catch (error) {
    return queryFailure('client status change', error)
  }
}
