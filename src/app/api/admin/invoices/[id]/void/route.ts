// src/app/api/admin/invoices/[id]/void/route.ts
//
// POST — void a draft or an issued, UNPAID invoice. Body: { reason? }. void_invoice refuses any invoice that has a recorded payment
// (money received is never voided away; that needs a refund / credit process) and any paid invoice; repeating it is a no-op.
// The reason is kept only in an INTERNAL activity event — never on the invoice, whose notes are printed for the client.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { callRpc, refusal } from '@/lib/commerce/rpc'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await request.json().catch(() => null)
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 240) : null
  const result = await callRpc(auth.db, 'void_invoice', { p_invoice_id: id, p_actor: auth.userId, p_reason: reason })
  if (!result.ok) return result.response
  const refused = refusal(result.outcome, ['voided', 'void'])
  if (refused) return refused
  return NextResponse.json({ success: true, duplicate: result.outcome.status === 'void' })
}
