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
import EmptyState from '@/components/client-portal/EmptyState'
import { PortalPageHeader } from '@/components/client-portal/PortalPageHeader'
import { PortalStatus } from '@/components/client-portal/PortalStatus'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { toneForRequest } from '@/lib/client-portal/portal-status'
import { formatDay } from '@/lib/client-portal/support-display'
import { REQUEST_STATUS_LABELS, type RequestStatus } from '@/lib/requests/request-status'
import prim from '@/components/client-portal/portal-primitives.module.css'
import styles from '@/components/client-portal/portal-screens.module.css'

interface PortalRequest {
  id: string
  title: string
  description: string | null
  status: RequestStatus
  createdAt: string | null
  lastActivityAt: string | null
  response: string | null
  projectName: string | null
  unreadReplies: number
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
      <PortalPageHeader
        eyebrow="Requests"
        title="What you’ve asked Hbee for"
        lead="Each request you have submitted, the project it belongs to and where it stands."
        action={
          <Link href="/client-portal/project-request" className={prim.primary}>
            <Plus aria-hidden="true" />
            Submit a request
          </Link>
        }
      />

      {requests.length === 0 ? (
        <section className={styles.panel}>
          <EmptyState
            title="No requests yet"
            description="When you submit a request, it will be listed here with its status."
            action={
              <Link href="/client-portal/project-request" className={prim.link}>
                Submit a request
              </Link>
            }
          />
        </section>
      ) : (
        <section className={styles.section} aria-label="Your requests">
          <ul className={styles.rows}>
            {requests.map((r) => {
              const status = REQUEST_STATUS_LABELS[r.status] ?? null
              const date = formatDay(r.createdAt)
              return (
                <li key={r.id}>
                  <div className={`${styles.row}`}>
                    <div className={styles.rowMain}>
                      <p className={styles.rowTitle}>
                        <Link href={`/client-portal/requests/${r.id}`}>{r.title}</Link>
                      </p>
                      {r.description && <p className={`${styles.rowText} ${styles.rowClamp}`}>{r.description}</p>}
                      <div className={styles.rowMeta}>
                        {r.projectName && <span>Project: {r.projectName}</span>}
                        {date && <span>Submitted {date}</span>}
                      </div>
                      {r.response && (
                        <div className={styles.reply}>
                          <strong>Latest reply from Hbee</strong>
                          <p>{r.response}</p>
                        </div>
                      )}
                    </div>
                    <div className={styles.rowEnd}>
                      {r.unreadReplies > 0 && (
                        <PortalStatus tone="needs-you" size="sm">
                          {r.unreadReplies} new {r.unreadReplies === 1 ? 'reply' : 'replies'}
                        </PortalStatus>
                      )}
                      {status && <PortalStatus tone={toneForRequest(r.status)}>{status}</PortalStatus>}
                    </div>
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
