// src/app/api/client-portal/invoices/[id]/route.ts
//
// GET — one DELIVERED invoice of the CALLER's own client account, with its line items, payments, balance and payment
// instructions. Ownership is proved in the load (invoice -> project -> projects.client_id = the session's client); a missing,
// foreign, draft or malformed id answers the SAME 404. Read-only; no payment is initiated here. Admin-only fields (created_by,
// the proposal id, the client id) are not part of the returned shape.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { isVoidedInvoiceOfClient, loadInvoiceView } from '@/lib/commerce/documents'
import { UUID_RE } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'

const INVOICE_UNAVAILABLE_BODY = { state: 'unavailable', code: 'invoice_unavailable', error: 'This invoice is no longer available.' } as const

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const loaded = await loadInvoiceView(portal.db, id, { clientId: portal.client.id })
    if (!loaded) {
      // A voided invoice is not shown to clients. An old direct link (an email, a bookmark, a notification) gets a clear message
      // rather than a bare not-found. Only the owner can learn this; anything else stays the same 404.
      if (await isVoidedInvoiceOfClient(portal.db, id, portal.client.id)) return NextResponse.json(INVOICE_UNAVAILABLE_BODY, { status: 410 })
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { clientId: _c, proposalId: _p, ...safe } = loaded.view
    return NextResponse.json({ invoice: safe })
  } catch (error) {
    console.error('❌ Client invoice detail error:', error)
    return NextResponse.json({ error: 'Failed to load this invoice' }, { status: 500 })
  }
}
