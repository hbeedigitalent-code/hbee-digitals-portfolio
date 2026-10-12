// src/app/client-portal/invoices/page.tsx
//
// Invoices (Phase 18.7). Read-only. Reads ONE session-bound endpoint, /api/client-portal/invoices,
// which returns the caller's own invoices (owned via their projects) as an allow-list; it replaces
// the browser-side project_invoices.select('*'). Only stored fields are shown. There is no payment
// processing, no card entry, no invented payment status and no invoice PDF. If an invoice carries a
// stored payment link, it is offered only when it is a plain https URL.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { formatAmount, formatDay, humanStatus } from '@/lib/client-portal/support-display'
import { formatProjectDate } from '@/lib/client-portal/projects-display'
import styles from '@/components/client-portal/support.module.css'

interface PortalInvoice {
  id: string
  number: string | null
  amount: number | string | null
  currency: string | null
  status: string | null
  dueDate: string | null
  issuedAt: string | null
  projectName: string | null
  paymentLink: string | null
}

type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

export default function ClientInvoicesPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [invoices, setInvoices] = useState<PortalInvoice[]>([])

  const load = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch('/api/client-portal/invoices', { credentials: 'same-origin' })
      if (response.status === 409) {
        setState('ambiguous')
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.invoices)) {
        setState('error')
        return
      }
      setInvoices(payload.invoices as PortalInvoice[])
      setState('ready')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') return <SupportLoading />
  if (state === 'ambiguous') return <SupportAmbiguous what="invoices" />
  if (state === 'error') return <SupportError message="We could not load your invoices. Please try again in a moment." onRetry={load} />

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" className={styles.node} />
          Invoices
        </p>
        <h1 className={styles.h1}>Your invoices</h1>
        <p className={styles.lead}>Invoices issued for your projects, as recorded by Hbee.</p>
      </header>

      {invoices.length === 0 ? (
        <section className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}>
            <h2>No invoices yet</h2>
            <p>Invoices for your projects will appear here once they have been issued.</p>
          </div>
        </section>
      ) : (
        <section className={styles.panel} aria-label="Your invoices">
          <ul className={styles.list}>
            {invoices.map((i) => {
              const amount = formatAmount(i.amount, i.currency)
              const status = humanStatus(i.status)
              const issued = formatDay(i.issuedAt)
              // due_date is a calendar date, not an instant: formatted without any timezone shift.
              const due = formatProjectDate(i.dueDate)
              return (
                <li key={i.id} className={styles.item}>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.itemTitle}>{i.number ? `Invoice ${i.number}` : 'Invoice'}</p>
                    <div className={styles.itemMeta}>
                      {i.projectName && <span>Project: {i.projectName}</span>}
                      {issued && <span>Issued {issued}</span>}
                      {due && <span>Due {due}</span>}
                    </div>
                  </div>
                  <div className={styles.endCol}>
                    {amount ? <span className={styles.amount}>{amount}</span> : <span className={styles.muted}>Amount not set</span>}
                    {status && <span className={styles.chip}>{status}</span>}
                    {i.paymentLink && (
                      <a href={i.paymentLink} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        Payment link
                        <ExternalLink aria-hidden="true" width={14} height={14} />
                      </a>
                    )}
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
