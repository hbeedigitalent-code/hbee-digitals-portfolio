// src/app/client-portal/invoices/page.tsx
//
// Invoices (S6.4). Reads ONE session-bound endpoint, /api/client-portal/invoices, which returns only the caller's own DELIVERED
// invoices with the paid amount and balance taken from the payment ledger. "Overdue" is derived on the server from the due date.
// Read-only: there is no payment processing here, so there is no "Pay now" button; each invoice shows its payment instructions
// on its detail page and offers the PDF.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { formatDay } from '@/lib/client-portal/support-display'
import { formatMoney } from '@/lib/commerce/money'
import styles from '@/components/client-portal/support.module.css'

interface Invoice { id: string; number: string | null; amount: string; currency: string | null; status: string; statusLabel: string; paid: string; balance: string; issueDate: string | null; dueDate: string | null; projectName: string | null }
type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

export default function ClientInvoicesPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [invoices, setInvoices] = useState<Invoice[]>([])

  const load = useCallback(async () => {
    setState('loading')
    try {
      const r = await fetch('/api/client-portal/invoices', { credentials: 'same-origin' })
      if (r.status === 409) return setState('ambiguous')
      const p = await r.json().catch(() => null)
      if (!r.ok || !Array.isArray(p?.invoices)) return setState('error')
      setInvoices(p.invoices); setState('ready')
    } catch { setState('error') }
  }, [])
  useEffect(() => { load() }, [load])

  if (state === 'loading') return <SupportLoading />
  if (state === 'ambiguous') return <SupportAmbiguous what="invoices" />
  if (state === 'error') return <SupportError message="We could not load your invoices. Please try again in a moment." onRetry={load} />

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}><span aria-hidden="true" className={styles.node} />Invoices</p>
          <h1 className={styles.h1}>What you have been invoiced</h1>
          <p className={styles.lead}>Each invoice Hbee has issued, what has been paid and what is still due.</p>
        </div>
      </header>

      {invoices.length === 0 ? (
        <section className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}><h2>No invoices yet</h2><p>When Hbee issues an invoice for your work it will appear here.</p></div>
        </section>
      ) : (
        <section className={styles.panel} aria-label="Your invoices">
          <ul className={styles.list}>
            {invoices.map((i) => {
              const currency = i.currency || 'USD'
              return (
                <li key={i.id} className={styles.item}>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.itemTitle}><Link href={`/client-portal/invoices/${i.id}`} className={styles.link}>{i.number || 'Invoice'}</Link></p>
                    <div className={styles.itemMeta}>
                      {i.projectName && <span>{i.projectName}</span>}
                      {i.issueDate && <span>Issued {formatDay(i.issueDate)}</span>}
                      {i.dueDate && <span>Due {formatDay(i.dueDate)}</span>}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>Total {formatMoney(i.amount, currency)}</span>
                      <span>Paid {formatMoney(i.paid, currency)}</span>
                      <span>Balance {formatMoney(i.balance, currency)}</span>
                    </div>
                  </div>
                  <div className={styles.endCol}>
                    <span className={styles.chip}>{i.statusLabel}</span>
                    <a className={styles.link} href={`/api/client-portal/invoices/${i.id}/pdf`} target="_blank" rel="noopener noreferrer"><Download aria-hidden="true" /> PDF</a>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
