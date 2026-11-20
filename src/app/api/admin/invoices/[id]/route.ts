// src/app/api/admin/invoices/[id]/route.ts
//
// GET   — the full invoice for the Admin: figures (total, paid, balance — computed from the immutable ledger with exact integer
//         arithmetic), lines WITH their ids (for the draft editor), the payment ledger, client / project / proposal.
// PATCH — edit the DRAFT's own fields (dates, discount, tax, notes, payment instructions, payment link). The write is conditional on
//         status = 'draft' in the UPDATE itself, and the database guard refuses it anyway once the invoice is issued. amount,
//         subtotal, status, currency and the number are not accepted: the database derives or owns them.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { parseInvoicePatch } from '@/lib/commerce/draft-input'
import { loadInvoiceView } from '@/lib/commerce/documents'
import { invoiceActions } from '@/lib/commerce/invoice-status'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const loaded = await loadInvoiceView(auth.db, id, { admin: true })
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: lines } = await auth.db.from('invoice_line_items').select('id, title, description, quantity, unit_price, line_amount, sort_order').eq('invoice_id', id).order('sort_order', { ascending: true })
    return NextResponse.json({ invoice: loaded.view, client: loaded.client, lines: lines || [], actions: invoiceActions(loaded.view.status) })
  } catch (error) {
    return queryFailure('invoice read', error)
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const parsed = parseInvoicePatch(await request.json().catch(() => null))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error, field: parsed.field }, { status: 400 })
    const { data, error } = await auth.db.from('project_invoices').update(parsed.patch).eq('id', id).eq('status', 'draft').select('id, amount, subtotal, discount_amount, tax_amount').maybeSingle()
    if (error) {
      const code = (error as { code?: string }).code
      if (code === '23514') return NextResponse.json({ error: 'The discount cannot be more than the subtotal.', code: 'invalid_discount' }, { status: 409 })
      if (code === '55000') return NextResponse.json({ error: 'Only a draft invoice can be edited.', code: 'not_draft' }, { status: 409 })
      return queryFailure('invoice update', error)
    }
    if (!data) {
      const { data: exists } = await auth.db.from('project_invoices').select('id').eq('id', id).maybeSingle()
      return exists ? NextResponse.json({ error: 'Only a draft invoice can be edited.', code: 'not_draft' }, { status: 409 }) : NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, invoice: { id, total: String(data.amount), subtotal: String(data.subtotal) } })
  } catch (error) {
    return queryFailure('invoice update', error)
  }
}
