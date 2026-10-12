// src/app/client-portal/requests/page.tsx
//
// Requests (Phase 18.7). Reads ONE session-bound endpoint, /api/client-portal/requests, which
// returns the caller's own project requests as an allow-list (it replaces the browser-side
// project_requests.select('*')). New requests are made through the one existing flow,
// /client-portal/project-request — the inline insert form that used to live here is gone.
// Statuses are shown as stored (humanised for display only); this is not a messaging surface.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { formatDay, humanStatus } from '@/lib/client-portal/support-display'
import styles from '@/components/client-portal/support.module.css'

interface PortalRequest {
  id: string
  title: string
  description: string | null
  status: string | null
  createdAt: string | null
  response: string | null
  projectName: string | null
}

type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

export default function ClientRequestsPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [requests, setRequests] = useState<PortalRequest[]>([])

  const load = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch('/api/client-portal/requests', { credentials: 'same-origin' })
      if (response.status === 409) {
        setState('ambiguous')
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.requests)) {
        setState('error')
        return
      }
      setRequests(payload.requests as PortalRequest[])
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
  if (state === 'ambiguous') return <SupportAmbiguous what="requests" />
  if (state === 'error') return <SupportError message="We could not load your requests. Please try again in a moment." onRetry={load} />

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Requests
          </p>
          <h1 className={styles.h1}>What you&rsquo;ve asked Hbee for</h1>
          <p className={styles.lead}>Each request you have submitted, the project it belongs to and where it stands.</p>
        </div>
        <Link href="/client-portal/project-request" className={styles.primary}>
          <Plus aria-hidden="true" />
          Submit a request
        </Link>
      </header>

      {requests.length === 0 ? (
        <section className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}>
            <h2>No requests yet</h2>
            <p>When you submit a request, it will be listed here with its status.</p>
          </div>
        </section>
      ) : (
        <section className={styles.panel} aria-label="Your requests">
          <ul className={styles.list}>
            {requests.map((r) => {
              const status = humanStatus(r.status)
              const date = formatDay(r.createdAt)
              return (
                <li key={r.id} className={styles.item}>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.itemTitle}>{r.title}</p>
                    {r.description && <p className={styles.itemText}>{r.description}</p>}
                    <div className={styles.itemMeta}>
                      {r.projectName && <span>Project: {r.projectName}</span>}
                      {date && <span>Submitted {date}</span>}
                    </div>
                    {r.response && (
                      <div className={styles.response}>
                        <strong>Response</strong>
                        <p>{r.response}</p>
                      </div>
                    )}
                  </div>
                  {status && <span className={styles.chip}>{status}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
