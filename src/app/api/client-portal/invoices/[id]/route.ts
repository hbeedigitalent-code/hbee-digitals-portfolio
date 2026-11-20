// src/app/api/client-portal/invoices/[id]/route.ts
//
// GET — one DELIVERED invoice of the CALLER's own client account, with its line items, payments, balance and payment
// instructions. Ownership is proved in the load (invoice -> project -> projects.client_id = the session's client); a missing,
// foreign, draft or malformed id answers the SAME 404. Read-only; no payment is initiated here. Admin-only fields (created_by,
// the proposal id, the client id) are not part of the returned shape.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { loadInvoiceView } from '@/lib/commerce/documents'
import { UUID_RE } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const loaded = await loadInvoiceView(portal.db, id, { clientId: portal.client.id })
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { clientId: _c, proposalId: _p, ...safe } = loaded.view
    return NextResponse.json({ invoice: safe })
  } catch (error) {
    console.error('❌ Client invoice detail error:', error)
    return NextResponse.json({ error: 'Failed to load this invoice' }, { status: 500 })
  }
}
