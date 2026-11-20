// src/app/api/client-portal/invoices/[id]/pdf/route.ts
//
// GET — the invoice PDF for the CALLER's own client, generated on demand from the invoice's own rows (copied line items and the
// payment ledger). Ownership and delivery are proved in the load; a missing, foreign, draft or malformed id is the SAME 404.
// Nothing is stored and there is no URL to share.

import { NextResponse } from 'next/server'
import { resolvePortalClient } from '@/lib/client-portal/portal-client'
import { loadInvoiceView, invoicePdfInput } from '@/lib/commerce/documents'
import { buildInvoicePdf, pdfFileName } from '@/lib/commerce/pdf'
import { pdfResponse, pdfFailure } from '@/lib/commerce/pdf-response'
import { UUID_RE } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const portal = await resolvePortalClient()
    if (!portal.ok) return portal.response
    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const loaded = await loadInvoiceView(portal.db, id, { clientId: portal.client.id })
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const bytes = await buildInvoicePdf(invoicePdfInput(loaded.view, loaded.client))
    return pdfResponse(bytes, pdfFileName('invoice', loaded.view.number))
  } catch (error) {
    console.error('❌ Client invoice PDF error:', error instanceof Error ? error.name : 'unknown')
    return pdfFailure()
  }
}
