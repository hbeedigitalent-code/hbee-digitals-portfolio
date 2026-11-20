// src/app/api/admin/invoices/[id]/lines/[line_id]/route.ts
//
// PATCH  — edit a line of a DRAFT invoice. DELETE — remove one. The row is addressed as (id = :line AND invoice_id = :invoice), so
// a line id from another invoice is a 404, never a cross-invoice write. The database refuses any change once the invoice is
// issued (55000 -> 409) and refuses a removal that would leave the discount larger than the subtotal (23514 -> 409).

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { parseInvoiceLine } from '@/lib/commerce/draft-input'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string; line_id: string } }

function failure(error: unknown, label: string) {
  const code = (error as { code?: string } | null)?.code
  if (code === '55000') return NextResponse.json({ error: 'Only a draft invoice can be changed.', code: 'not_draft' }, { status: 409 })
  if (code === '23514') return NextResponse.json({ error: 'Reduce the discount first: it would be larger than the subtotal.', code: 'invalid_discount' }, { status: 409 })
  return queryFailure(label, error)
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  const lineId = typeof params?.line_id === 'string' ? params.line_id.trim() : ''
  if (!ADMIN_UUID_RE.test(id) || !ADMIN_UUID_RE.test(lineId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const parsed = parseInvoiceLine(await request.json().catch(() => null), true)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { data, error } = await auth.db.from('invoice_line_items').update(parsed.line).eq('id', lineId).eq('invoice_id', id).select('id, title, description, quantity, unit_price, line_amount, sort_order').maybeSingle()
  if (error) return failure(error, 'invoice line update')
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ line: data })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  const lineId = typeof params?.line_id === 'string' ? params.line_id.trim() : ''
  if (!ADMIN_UUID_RE.test(id) || !ADMIN_UUID_RE.test(lineId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error } = await auth.db.from('invoice_line_items').delete().eq('id', lineId).eq('invoice_id', id).select('id')
  if (error) return failure(error, 'invoice line delete')
  if (!data || data.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
