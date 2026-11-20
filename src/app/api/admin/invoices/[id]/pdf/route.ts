// src/app/api/admin/invoices/[id]/pdf/route.ts
//
// GET — the invoice PDF for an Admin, generated on demand from the invoice's OWN rows (its copied line items and its payment ledger),
// never from the live proposal. Nothing is stored. A draft prints as "Draft" with its current figures.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { loadInvoiceView, invoicePdfInput } from '@/lib/commerce/documents'
import { buildInvoicePdf, pdfFileName } from '@/lib/commerce/pdf'
import { pdfResponse, pdfFailure } from '@/lib/commerce/pdf-response'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const loaded = await loadInvoiceView(auth.db, id, { admin: true })
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const bytes = await buildInvoicePdf(invoicePdfInput(loaded.view, loaded.client))
    return pdfResponse(bytes, pdfFileName('invoice', loaded.view.number))
  } catch (error) {
    console.error('❌ Admin invoice PDF error:', error instanceof Error ? error.name : 'unknown')
    return pdfFailure()
  }
}
