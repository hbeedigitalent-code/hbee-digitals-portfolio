// src/app/client-portal/invoices/[id]/page.tsx
//
// One invoice, read-only: number, status (overdue derived from the due date), issue and due dates, line items, subtotal / discount
// / tax / total, payments received, the balance, the payment instructions Hbee configured, and the PDF. There is no "Pay now": no
// payment processor is integrated, so the page says how to pay instead of pretending it can take payment.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { formatDay } from '@/lib/client-portal/support-display'
import { formatMoney } from '@/lib/commerce/money'
import support from '@/components/client-portal/support.module.css'
import styles from '@/components/client-portal/commerce.module.css'

interface Inv {
  id: string; number: string; status: string; displayStatus: string; statusLabel: string; currency: string; issueDate: string | null; dueDate: string | null
  subtotal: string; discount: string; tax: string; total: string; paid: string; balance: string; notes: string | null; paymentInstructions: string | null; paymentLink: string | null
  lines: Array<{ title: string; description?: string | null; quantity: string; unit_price: string; amount: string }>
  payments: Array<{ id: string; paid_at: string; amount: string; method: string | null; reference: string | null }>
  project: { id: string; name: string; reference: string | null }; proposalNumber: string | null
}
type LoadState = 'loading' | 'ready' | 'ambiguous' | 'missing' | 'error'

export default function ClientInvoiceDetailPage({ params }: { params: { id: string } }) {
  const [state, setState] = useState<LoadState>('loading')
  const [inv, setInv] = useState<Inv | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/client-portal/invoices/${params.id}`, { credentials: 'same-origin' })
      if (r.status === 409) return setState('ambiguous')
      if (r.status === 404) return setState('missing')
      const p = await r.json().catch(() => null)
      if (!r.ok || !p?.invoice) return setState('error')
      setInv(p.invoice); setState('ready')
    } catch { setState('error') }
  }, [params.id])
  useEffect(() => { load() }, [load])

  if (state === 'loading') return <SupportLoading />
  if (state === 'ambiguous') return <SupportAmbiguous what="invoices" />
  if (state === 'error') return <SupportError message="We could not load this invoice. Please try again in a moment." onRetry={load} />
  if (state === 'missing' || !inv) {
    return <div className={support.page}><section className={`${support.panel} ${support.center}`}><div className={support.centerBody}><h2>Invoice not found</h2><Link href="/client-portal/invoices" className={support.link}>Back to invoices</Link></div></section></div>
  }
  const open = inv.status === 'issued' || inv.status === 'partially_paid'

  return (
    <div className={support.page}>
      <header className={support.head}>
        <div>
          <Link href="/client-portal/invoices" className={support.link}><ArrowLeft aria-hidden="true" /> All invoices</Link>
          <h1 className={support.h1}>{inv.number}</h1>
          <div className={styles.meta}>
            <span className={support.chip}>{inv.statusLabel}</span>
            <span>{inv.project.name}</span>
            {inv.issueDate && <span>Issued {formatDay(inv.issueDate)}</span>}
            {inv.dueDate && <span>Due {formatDay(inv.dueDate)}</span>}
          </div>
        </div>
        <a className={support.secondary} href={`/api/client-portal/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"><Download aria-hidden="true" /> Download PDF</a>
      </header>

      <section className={`${support.panel} ${styles.doc}`}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Items</h2>
          <div className={styles.head} aria-hidden="true"><span>Item</span><span>Qty</span><span>Unit price</span><span>Amount</span></div>
          <ul className={styles.lines}>
            {inv.lines.map((l, i) => (
              <li key={i} className={styles.line}>
                <span className={styles.lineTitle}>{l.title}</span>
                <span className={styles.lineAmt}>{formatMoney(l.amount, inv.currency)}</span>
                {l.description && <span className={styles.lineDesc}>{l.description}</span>}
                <span className={styles.lineQty}>Qty {Number(l.quantity)} × {formatMoney(l.unit_price, inv.currency)}</span>
                <span className={styles.lineUnit}>{formatMoney(l.unit_price, inv.currency)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.totals}>
            <div className={styles.totalRow}><span>Subtotal</span><span>{formatMoney(inv.subtotal, inv.currency)}</span></div>
            {Number(inv.discount) > 0 && <div className={styles.totalRow}><span>Discount</span><span>-{formatMoney(inv.discount, inv.currency)}</span></div>}
            {Number(inv.tax) > 0 && <div className={styles.totalRow}><span>Tax</span><span>{formatMoney(inv.tax, inv.currency)}</span></div>}
            <div className={styles.totalRow}><span>Total</span><span>{formatMoney(inv.total, inv.currency)}</span></div>
            <div className={styles.totalRow}><span>Paid</span><span>{formatMoney(inv.paid, inv.currency)}</span></div>
            <div className={`${styles.totalRow} ${styles.totalStrong}`}><span>Balance due ({inv.currency})</span><span>{formatMoney(inv.balance, inv.currency)}</span></div>
          </div>
        </div>

        {inv.payments.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Payments received</h2>
            <ul className={styles.files}>
              {inv.payments.map((p) => <li key={p.id} className={styles.file}><span className={styles.fileName}>{formatDay(p.paid_at)}{p.method ? ` · ${p.method}` : ''}{p.reference ? ` · ref ${p.reference}` : ''}</span><span>{formatMoney(p.amount, inv.currency)}</span></li>)}
            </ul>
          </div>
        )}

        {open && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>How to pay</h2>
            {inv.paymentInstructions ? <p className={styles.prose}>{inv.paymentInstructions}</p> : <p className={styles.prose}>Payment instructions have not been added to this invoice yet. Please contact Hbee Digitals and quote {inv.number}.</p>}
            {inv.paymentLink && <p><a className={support.link} href={inv.paymentLink} target="_blank" rel="noopener noreferrer">Open the payment link</a></p>}
          </div>
        )}
        {inv.notes && <div className={styles.section}><h2 className={styles.sectionTitle}>Notes</h2><p className={styles.prose}>{inv.notes}</p></div>}
        {inv.status === 'void' && <p className={support.warn}>This invoice was voided and is no longer payable.</p>}
      </section>
    </div>
  )
}
