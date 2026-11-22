// src/app/api/admin/invoices/[id]/payments/route.ts
//
// POST — record a payment on an issued invoice. Body: { amount: "123.45", paid_at: "YYYY-MM-DD", method?, reference?, note?, clientKey? }.
//
// The amount is a decimal STRING all the way to PostgreSQL. record_invoice_payment locks the invoice, refuses a zero, negative or
// sub-cent amount, a payment against a draft / void / paid invoice, and any payment that would exceed the remaining balance
// (the ledger trigger refuses it independently, too); it appends to the immutable ledger, derives paid / partially_paid from the
// ledger and records the event, all in one transaction. `clientKey` makes a retried POST return the first payment instead of
// recording a second. The notification is keyed on the payment (or, for the final one, on the invoice), so it is never duplicated.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'
import { callRpc, refusal } from '@/lib/commerce/rpc'
import { isPlainMoney } from '@/lib/commerce/money'
import { notifyPaymentRecorded } from '@/lib/commerce/notify'
import { emailPaymentRecorded } from '@/lib/commerce/transactional-email'
import type { EmailFeedback } from '@/lib/commerce/email-feedback'

export const dynamic = 'force-dynamic'

const KEY_RE = /^[A-Za-z0-9_-]{8,80}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireActiveAdmin()
  if (!auth.ok) return auth.response
  const id = typeof params?.id === 'string' ? params.id.trim() : ''
  if (!ADMIN_UUID_RE.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    const body = await request.json().catch(() => null)
    const amount = typeof body?.amount === 'number' ? String(body.amount) : typeof body?.amount === 'string' ? body.amount.trim() : ''
    if (!isPlainMoney(amount) || Number(amount) <= 0) return NextResponse.json({ error: 'Enter an amount greater than zero with at most two decimals.', field: 'amount' }, { status: 400 })
    const paidAt = typeof body?.paid_at === 'string' ? body.paid_at.trim() : ''
    if (!DATE_RE.test(paidAt) || Number.isNaN(new Date(paidAt).getTime())) return NextResponse.json({ error: 'Enter the payment date.', field: 'paid_at' }, { status: 400 })
    const clip = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null)
    const key = typeof body?.clientKey === 'string' && KEY_RE.test(body.clientKey) ? body.clientKey : null

    const result = await callRpc(auth.db, 'record_invoice_payment', {
      p_invoice_id: id, p_amount: amount, p_paid_at: paidAt, p_method: clip(body?.method, 60), p_reference: clip(body?.reference, 120), p_note: clip(body?.note, 1000), p_actor: auth.userId, p_key: key,
    })
    if (!result.ok) return result.response
    const refused = refusal(result.outcome, ['recorded'])
    if (refused) return refused
    const o = result.outcome

    let notified = false
    if (o.duplicate !== true && o.client_id) {
      notified = await notifyPaymentRecorded({ clientId: String(o.client_id), invoiceId: id, paymentId: String(o.payment_id), number: String(o.invoice_number ?? ''), paid: o.invoice_status === 'paid' })
    }
    // ONE client email per NEW payment. A retried POST (`duplicate`) recorded nothing and mails nothing. The payment has committed; a failed
    // email never undoes it, and the Admin page receives a safe result, not the provider's error.
    let email: EmailFeedback | undefined
    if (o.duplicate !== true && o.client_id) {
      email = await emailPaymentRecorded(auth.db, {
        clientId: String(o.client_id), invoiceId: id, paymentId: String(o.payment_id), number: String(o.invoice_number ?? ''), currency: String(o.currency ?? 'USD'),
        balance: String(o.balance ?? ''), invoiceStatus: String(o.invoice_status ?? ''), fallbackAmount: amount, fallbackPaidAt: paidAt, sentBy: auth.userId,
      })
    }
    return NextResponse.json({ success: true, duplicate: o.duplicate === true, email, payment: { id: o.payment_id }, invoice: { status: o.invoice_status, paid: o.paid_total, balance: o.balance }, notified }, { status: o.duplicate === true ? 200 : 201 })
  } catch (error) {
    console.error('❌ Admin payment error:', error)
    return NextResponse.json({ error: 'The payment could not be recorded.' }, { status: 500 })
  }
}
