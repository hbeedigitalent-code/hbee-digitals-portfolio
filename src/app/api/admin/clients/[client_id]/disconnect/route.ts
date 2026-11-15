// src/app/api/admin/clients/[client_id]/disconnect/route.ts
//
// POST — explicitly disconnect a Portal account from its merchant/business, for an authenticated, 2FA-verified,
// active admin.
//
// This is the ONE place clients.merchant_id is set back to null. It is deliberately narrow:
//   * the body must carry { confirm: true } AND the merchantId the admin believes is linked, and the update is
//     conditional on that exact pair (.eq('merchant_id', merchantId)), so a stale screen or a double click can
//     never disconnect a different business than the one shown;
//   * only clients.merchant_id is cleared. The Auth user, the clients row, the Portal login, projects, files and
//     the business record itself are left exactly as they are, and nothing is deleted;
//   * afterwards the account is a normal unconnected Portal account again (connected-only actions return
//     not_connected; Growth Profile returns not_connected).
//
// Linking history: link_client_to_merchant() writes a client_merchant_links row, but that table's schema is not in
// this repository, so this route does not guess at it. The admin id is logged server-side; an unlink RPC that
// records history is proposed, not run, in the S6.2 report.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { client_id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  try {
    const clientId = typeof params?.client_id === 'string' ? params.client_id.trim() : ''
    if (!ADMIN_UUID_RE.test(clientId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json().catch(() => null)
    const merchantId = typeof body?.merchantId === 'string' ? body.merchantId.trim() : ''
    if (body?.confirm !== true || !ADMIN_UUID_RE.test(merchantId)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { data: updated, error } = await db
      .from('clients')
      .update({ merchant_id: null, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('merchant_id', merchantId)
      .select('id')
      .maybeSingle()

    if (error) return queryFailure('client disconnect', error)
    if (!updated) {
      return NextResponse.json(
        {
          error: 'not_linked_to_that_business',
          message: 'That account is not linked to that business (it may already have been changed).',
        },
        { status: 409 },
      )
    }

    console.log(`[admin-api] client ${clientId} disconnected from merchant ${merchantId} by admin ${userId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    return queryFailure('client disconnect', error)
  }
}
