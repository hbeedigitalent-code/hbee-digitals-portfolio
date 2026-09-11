// src/app/api/admin/clients/link-merchant/route.ts
//
// POST — the authorized admin action that links a portal account (clients row)
// to a merchant record. This is the missing piece the approval flow refuses
// without: the decision endpoint reports `client_not_linked` and does NOT fix
// it, because linking two identities is a deliberate act that must be
// attributable to a person.
//
// WHAT IT WILL NOT DO
//   * Match by email. An address is not proof of identity, and two of the
//     records in this database already share one. Both ids are supplied
//     explicitly by an admin who has looked at them.
//   * Merge anything. Merchants and clients are never combined or deleted.
//   * Steal a merchant. A merchant already linked to a DIFFERENT client is a
//     conflict and is refused.
//   * Silently move a client. Relinking a client that already has a different
//     merchant requires `allowRelink: true`, and the previous merchant id is
//     recorded rather than erased.
//
// Every call that changes anything writes a client_merchant_links audit row
// naming the acting admin, so a link can always be traced back to a decision.
//
// Not covered by middleware.ts, so session -> user-bound 2FA -> active admin is
// re-verified here.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

const MAX_REASON = 500

const REFUSALS: Record<string, string> = {
  client_not_found: 'That portal account could not be found.',
  merchant_not_found: 'That merchant record could not be found.',
  merchant_already_linked:
    'That merchant is already linked to a different portal account. Resolve which ' +
    'account is correct before linking; nothing is merged automatically.',
  client_already_linked:
    'That portal account is already linked to a different merchant. Re-link it ' +
    'explicitly if that is genuinely intended.',
}

export async function POST(request: Request) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const { db, userId } = auth

  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
    const merchantId = typeof body?.merchantId === 'string' ? body.merchantId.trim() : ''

    if (!ADMIN_UUID_RE.test(clientId) || !ADMIN_UUID_RE.test(merchantId)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const reason =
      typeof body?.reason === 'string' && body.reason.trim()
        ? body.reason.trim().slice(0, MAX_REASON)
        : null

    // Relinking is destructive to an existing association, so it is opt-in.
    const allowRelink = body?.allowRelink === true

    const { data: outcome, error } = await db.rpc('link_client_to_merchant', {
      p_client_id: clientId,
      p_merchant_id: merchantId,
      p_actor: userId,
      p_reason: reason,
      p_allow_relink: allowRelink,
    })

    if (error) return queryFailure('client link', error)

    if (!outcome?.ok) {
      const key = String(outcome?.reason ?? 'unknown')
      const message = REFUSALS[key]
      if (!message) {
        console.error(`[link-merchant] refused: ${key}`)
        return NextResponse.json({ error: 'Failed to link the account' }, { status: 500 })
      }
      return NextResponse.json({ error: key, message }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      changed: outcome.changed === true,
      action: outcome.reason,
      previousMerchantId: outcome.previous_merchant_id ?? null,
    })
  } catch (error) {
    return queryFailure('client link', error)
  }
}
