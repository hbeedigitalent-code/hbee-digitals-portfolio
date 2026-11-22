// src/app/api/admin/invoices/[id]/issue/route.ts
//
// POST — issue a DRAFT invoice. issue_invoice (one transaction, row-locked) requires a due date not before the issue date, at least
// one line and a positive total, stamps the issue time, and freezes every financial field. Idempotent in effect: issuing a
// non-draft is a 409 and sends nothing. One client notification, keyed on the invoice, and one client email. The body is ignored.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { callRpc, refusal } from '@/lib/commerce/rpc'
import { notifyInvoiceIssued } from '@/lib/commerce/notify'
import { emailInvoiceIssued } from '@/lib/commerce/transactional-email'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const result = await callRpc(auth.db, 'issue_invoice', { p_invoice_id: id, p_actor: auth.userId })
  if (!result.ok) return result.response
  const refused = refusal(result.outcome, ['issued'])
  if (refused) return refused
  const o = result.outcome
  const notified = o.client_id ? await notifyInvoiceIssued({ clientId: String(o.client_id), invoiceId: id, number: String(o.invoice_number ?? '') }) : false
  // ONE client email, after the issue has committed and only for a newly issued invoice (a non-draft returned above and sent nothing).
  // Its failure never undoes the issue; the Admin page gets a safe result, not the provider's error.
  const email = o.client_id
    ? await emailInvoiceIssued(auth.db, { clientId: String(o.client_id), invoiceId: id, number: String(o.invoice_number ?? ''), amount: String(o.amount ?? ''), currency: String(o.currency ?? 'USD'), sentBy: auth.userId })
    : ({ status: 'failed', reason: 'no_recipient' } as const)
  return NextResponse.json({ success: true, invoice: { id, number: o.invoice_number, status: 'issued' }, notified, email })
}
