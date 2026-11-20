// src/app/admin/invoices/[id]/page.tsx
//
// Admin invoice detail: draft editing (dates, discount, tax, notes, payment instructions, lines), issue, payment recording,
// void, PDF. Every action is a server route; the page recomputes nothing authoritative — totals, balance and status come from the
// server, and once an invoice is issued its financial fields are read-only here AND refused by the database.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMoney, isPlainMoney, isPlainQuantity } from '@/lib/commerce/money'

interface Detail {
  invoice: { id: string; number: string; status: string; displayStatus: string; statusLabel: string; currency: string; issueDate: string | null; dueDate: string | null; subtotal: string; discount: string; tax: string; total: string; paid: string; balance: string; notes: string | null; paymentInstructions: string | null; paymentLink: string | null; payments: Array<{ id: string; paid_at: string; amount: string; method: string | null; reference: string | null }>; project: { id: string; name: string; reference: string | null }; proposalId: string | null; proposalNumber: string | null; clientId: string | null }
  client: { name: string; business: string | null } | null
  lines: Array<{ id: string; title: string; description: string | null; quantity: string | number; unit_price: string | number; line_amount: string | number }>
  actions: string[]
}

const card = 'rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4'
const field = 'min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]'
const btn = 'min-h-[44px] rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60'

function newKey() { try { return crypto.randomUUID() } catch { return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}` } }

export default function AdminInvoiceDetailPage({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState({ due_date: '', issue_date: '', discount_amount: '0', tax_amount: '0', notes: '', payment_instructions: '', payment_link: '' })
  const [line, setLine] = useState({ title: '', description: '', quantity: '1', unit_price: '' })
  const [pay, setPay] = useState({ amount: '', paid_at: new Date().toISOString().slice(0, 10), method: '', reference: '', note: '' })
  const [payKey, setPayKey] = useState(newKey())
  const [reason, setReason] = useState('')
  const base = `/api/admin/invoices/${params.id}`

  const load = useCallback(async () => {
    try {
      const r = await fetch(base, { credentials: 'same-origin' })
      if (r.status === 404) return setState('missing')
      const p = await r.json().catch(() => null)
      if (!r.ok || !p?.invoice) return setState('error')
      setD(p); setState('ready')
      setEdit({ due_date: p.invoice.dueDate || '', issue_date: p.invoice.issueDate || '', discount_amount: p.invoice.discount, tax_amount: p.invoice.tax, notes: p.invoice.notes || '', payment_instructions: p.invoice.paymentInstructions || '', payment_link: p.invoice.paymentLink || '' })
    } catch { setState('error') }
  }, [base])
  useEffect(() => { load() }, [load])

  async function call(url: string, method: string, body?: unknown): Promise<any | null> {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      const p = await r.json().catch(() => null)
      if (!r.ok) { setMsg(p?.error || 'That could not be completed.'); return null }
      return p ?? {}
    } catch { setMsg('That could not be completed. Check your connection.'); return null } finally { setBusy(false) }
  }

  if (state === 'loading') return <p className="text-sm text-[var(--text-muted)]">Loading…</p>
  if (state === 'missing') return <p className="text-[var(--text-muted)]">Invoice not found. <Link href="/admin/invoices" className="underline">Back to invoices</Link></p>
  if (state === 'error' || !d) return <p role="alert" className="text-sm text-[var(--error)]">The invoice could not be loaded. <button type="button" className="underline" onClick={load}>Try again</button></p>

  const inv = d.invoice
  const draft = inv.status === 'draft'
  const canPay = d.actions.includes('payment')

  async function saveDraft() {
    const patch: Record<string, unknown> = { due_date: edit.due_date || null, issue_date: edit.issue_date || null, discount_amount: edit.discount_amount || '0', tax_amount: edit.tax_amount || '0', notes: edit.notes || null, payment_instructions: edit.payment_instructions || null, payment_link: edit.payment_link || null }
    if (!isPlainMoney(String(patch.discount_amount)) || !isPlainMoney(String(patch.tax_amount))) return setMsg('Discount and tax must be amounts with at most two decimals.')
    if (await call(base, 'PATCH', patch)) { setMsg('Draft saved.'); await load() }
  }
  async function addLine() {
    if (!line.title.trim() || !isPlainQuantity(line.quantity) || !isPlainMoney(line.unit_price)) return setMsg('A line needs a title, a quantity above zero and a unit price with at most two decimals.')
    if (await call(`${base}/lines`, 'POST', line)) { setLine({ title: '', description: '', quantity: '1', unit_price: '' }); await load() }
  }
  async function removeLine(id: string) { if (await call(`${base}/lines/${id}`, 'DELETE')) await load() }
  async function issue() {
    if (!confirm('Issue this invoice? Its amounts and lines will be locked and the client will be notified.')) return
    if (await call(`${base}/issue`, 'POST')) await load()
  }
  async function record() {
    if (!isPlainMoney(pay.amount) || Number(pay.amount) <= 0) return setMsg('Enter the amount received (greater than zero, at most two decimals).')
    if (await call(`${base}/payments`, 'POST', { ...pay, clientKey: payKey })) { setPayKey(newKey()); setPay({ ...pay, amount: '', reference: '', note: '' }); await load() }
  }
  async function voidIt() {
    if (!confirm('Void this invoice? This cannot be undone.')) return
    if (await call(`${base}/void`, 'POST', { reason })) await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/invoices" className="text-sm text-[var(--text-muted)] hover:underline">← Invoices</Link>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{inv.number} <span className="ml-2 rounded-full border border-[var(--border)] px-3 py-1 align-middle text-xs font-semibold">{inv.statusLabel}</span></h1>
          <p className="text-sm text-[var(--text-muted)]">{d.client?.name}{d.client?.business ? ` · ${d.client.business}` : ''} · <Link href={`/admin/projects/${inv.project.id}`} className="underline">{inv.project.name}</Link>{inv.proposalId ? <> · <Link href={`/admin/proposals/${inv.proposalId}`} className="underline">Proposal {inv.proposalNumber}</Link></> : null}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={btn + ' inline-flex items-center'} href={`${base}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF</a>
          {draft && <button type="button" disabled={busy} onClick={issue} className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-60">Issue invoice</button>}
        </div>
      </div>
      {msg && <p role="status" className="rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">{msg}</p>}

      <section className={card + ' space-y-3'}>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)]"><th className="py-1 pr-2">Item</th><th className="py-1 pr-2 text-right">Qty</th><th className="py-1 pr-2 text-right">Unit</th><th className="py-1 text-right">Amount</th>{draft && <th />}</tr></thead>
            <tbody>
              {d.lines.map((l) => (
                <tr key={l.id} className="border-t border-[var(--border)] align-top">
                  <td className="py-2 pr-2"><span className="break-words font-medium text-[var(--text-primary)]">{l.title}</span>{l.description ? <span className="block break-words text-xs text-[var(--text-muted)]">{l.description}</span> : null}</td>
                  <td className="py-2 pr-2 text-right">{Number(l.quantity)}</td>
                  <td className="py-2 pr-2 text-right">{formatMoney(l.unit_price, inv.currency)}</td>
                  <td className="py-2 text-right">{formatMoney(l.line_amount, inv.currency)}</td>
                  {draft && <td className="py-2 pl-2 text-right"><button type="button" onClick={() => removeLine(l.id)} className="min-h-[44px] px-2 text-sm text-[var(--text-secondary)] underline" aria-label={`Remove ${l.title}`}>Remove</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {draft && (
          <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
            <input aria-label="New line title" placeholder="Item" value={line.title} onChange={(e) => setLine({ ...line, title: e.target.value })} className={field} />
            <input aria-label="Quantity" inputMode="decimal" value={line.quantity} onChange={(e) => setLine({ ...line, quantity: e.target.value })} className={field} />
            <input aria-label="Unit price" inputMode="decimal" placeholder="0.00" value={line.unit_price} onChange={(e) => setLine({ ...line, unit_price: e.target.value })} className={field} />
            <button type="button" disabled={busy} onClick={addLine} className={btn}>Add line</button>
          </div>
        )}
        <dl className="ml-auto grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-[var(--text-muted)]">Subtotal</dt><dd className="text-right">{formatMoney(inv.subtotal, inv.currency)}</dd>
          {Number(inv.discount) > 0 && (<><dt className="text-[var(--text-muted)]">Discount</dt><dd className="text-right">-{formatMoney(inv.discount, inv.currency)}</dd></>)}
          {Number(inv.tax) > 0 && (<><dt className="text-[var(--text-muted)]">Tax</dt><dd className="text-right">{formatMoney(inv.tax, inv.currency)}</dd></>)}
          <dt className="font-semibold text-[var(--text-primary)]">Total</dt><dd className="text-right font-semibold text-[var(--text-primary)]">{formatMoney(inv.total, inv.currency)}</dd>
          <dt className="text-[var(--text-muted)]">Paid</dt><dd className="text-right">{formatMoney(inv.paid, inv.currency)}</dd>
          <dt className="font-semibold text-[var(--text-primary)]">Balance</dt><dd className="text-right font-semibold text-[var(--text-primary)]">{formatMoney(inv.balance, inv.currency)}</dd>
        </dl>
      </section>

      {draft && (
        <section className={card + ' space-y-3'}>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Draft details</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm text-[var(--text-secondary)]">Issue date<input type="date" value={edit.issue_date} onChange={(e) => setEdit({ ...edit, issue_date: e.target.value })} className={field} /></label>
            <label className="text-sm text-[var(--text-secondary)]">Due date<input type="date" value={edit.due_date} onChange={(e) => setEdit({ ...edit, due_date: e.target.value })} className={field} /></label>
            <label className="text-sm text-[var(--text-secondary)]">Discount ({inv.currency})<input inputMode="decimal" value={edit.discount_amount} onChange={(e) => setEdit({ ...edit, discount_amount: e.target.value })} className={field} /></label>
            <label className="text-sm text-[var(--text-secondary)]">Tax ({inv.currency})<input inputMode="decimal" value={edit.tax_amount} onChange={(e) => setEdit({ ...edit, tax_amount: e.target.value })} className={field} /></label>
          </div>
          <label className="block text-sm text-[var(--text-secondary)]">Payment instructions (shown to the client)<textarea rows={3} value={edit.payment_instructions} onChange={(e) => setEdit({ ...edit, payment_instructions: e.target.value })} className={field + ' py-2'} /></label>
          <label className="block text-sm text-[var(--text-secondary)]">Notes (printed on the invoice)<textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} className={field + ' py-2'} /></label>
          <label className="block text-sm text-[var(--text-secondary)]">Payment link (optional, https only)<input value={edit.payment_link} onChange={(e) => setEdit({ ...edit, payment_link: e.target.value })} className={field} /></label>
          <button type="button" disabled={busy} onClick={saveDraft} className={btn}>Save draft</button>
        </section>
      )}

      <section className={card + ' space-y-3'}>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Payments</h2>
        {inv.payments.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No payments recorded.</p> : (
          <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
            {inv.payments.map((p) => <li key={p.id}>{p.paid_at} · {formatMoney(p.amount, inv.currency)}{p.method ? ` · ${p.method}` : ''}{p.reference ? ` · ref ${p.reference}` : ''}</li>)}
          </ul>
        )}
        {canPay && (
          <div className="grid gap-2 sm:grid-cols-[8rem_10rem_1fr_1fr_auto]">
            <input aria-label="Amount received" inputMode="decimal" placeholder="Amount" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={field} />
            <input aria-label="Payment date" type="date" value={pay.paid_at} onChange={(e) => setPay({ ...pay, paid_at: e.target.value })} className={field} />
            <input aria-label="Method" placeholder="Method (e.g. bank transfer)" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} className={field} />
            <input aria-label="Reference" placeholder="Reference" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} className={field} />
            <button type="button" disabled={busy} onClick={record} className={btn}>Record payment</button>
          </div>
        )}
        {canPay && <p className="text-xs text-[var(--text-muted)]">Payments are a permanent ledger: they cannot be edited or deleted, and the invoice becomes “paid” only when they add up to the total. A payment above the balance is refused.</p>}
      </section>

      {d.actions.includes('void') && (
        <section className={card + ' space-y-2'}>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Void</h2>
          <p className="text-sm text-[var(--text-muted)]">Voiding is permanent. An invoice with recorded payments cannot be voided. The reason is kept in the internal history only — it is never printed or shown to the client.</p>
          <div className="flex flex-wrap gap-2">
            <input aria-label="Void reason" placeholder="Reason (internal)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={240} className={field + ' sm:max-w-sm'} />
            <button type="button" disabled={busy} onClick={voidIt} className={btn}>Void invoice</button>
          </div>
        </section>
      )}
    </div>
  )
}
