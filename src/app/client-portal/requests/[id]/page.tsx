// src/app/client-portal/requests/[id]/page.tsx
//
// One request: its status, the conversation with Hbee, the client-visible history, and the two things a client
// may do — reply, and confirm an answered request is resolved. Reads /api/client-portal/requests/[id] only; the
// server decides what is visible (no internal note is ever in that response).

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import RequestThread, { type ThreadMessage } from '@/components/requests/RequestThread'
import { SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { REQUEST_STATUS_LABELS, type RequestStatus } from '@/lib/requests/request-status'
import { formatDay } from '@/lib/client-portal/support-display'
import styles from '@/components/client-portal/support.module.css'

interface Detail {
  request: {
    id: string
    title: string
    description: string | null
    status: RequestStatus
    statusHint: string
    createdAt: string | null
    canReply: boolean
    canClose: boolean
    project: { id: string; name: string } | null
  }
  messages: Array<{ id: string; from: string; body: string; createdAt: string; unread: boolean; hasAttachment: boolean }>
  activity: Array<{ id: string; summary: string; createdAt: string }>
}

type LoadState = 'loading' | 'ready' | 'missing' | 'error'

export default function ClientRequestDetailPage({ params }: { params: { id: string } }) {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<Detail | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/client-portal/requests/${params.id}`, { credentials: 'same-origin' })
      if (response.status === 404) return setState('missing')
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.request) return setState('error')
      setData(payload as Detail)
      setState('ready')
      if ((payload.messages || []).some((m: { unread: boolean }) => m.unread)) {
        fetch(`/api/client-portal/requests/${params.id}/read`, { method: 'POST', credentials: 'same-origin' }).catch(() => undefined)
      }
    } catch {
      setState('error')
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function send(input: { body: string; clientKey: string }): Promise<string | null> {
    try {
      const response = await fetch(`/api/client-portal/requests/${params.id}/messages`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: input.body, clientKey: input.clientKey }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) return payload?.error || 'Your message could not be sent. Please try again.'
      await load()
      return null
    } catch {
      return 'Your message could not be sent. Check your connection and try again.'
    }
  }

  async function markResolved() {
    setNotice(null)
    const response = await fetch(`/api/client-portal/requests/${params.id}/status`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    if (!response.ok) setNotice('We could not update this request. Please try again.')
    else await load()
  }

  if (state === 'loading') return <SupportLoading />
  if (state === 'error') return <SupportError message="We could not load this request. Please try again in a moment." onRetry={load} />
  if (state === 'missing' || !data) {
    return (
      <div className={styles.page}>
        <section className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}>
            <h2>Request not found</h2>
            <Link href="/client-portal/requests" className={styles.link}>
              Back to requests
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const { request, messages, activity } = data
  const thread: ThreadMessage[] = messages.map((m) => ({ id: m.id, from: m.from, body: m.body, createdAt: m.createdAt, unread: m.unread, attachmentName: m.hasAttachment ? 'Attachment' : null }))

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <Link href="/client-portal/requests" className={styles.link}>
            <ArrowLeft aria-hidden="true" /> All requests
          </Link>
          <h1 className={styles.h1}>{request.title}</h1>
          <div className={styles.itemMeta}>
            <span className={styles.chip}>{REQUEST_STATUS_LABELS[request.status]}</span>
            {request.createdAt && <span>Submitted {formatDay(request.createdAt)}</span>}
            {request.project && <Link href={`/client-portal/projects/${request.project.id}`} className={styles.link}>Project: {request.project.name}</Link>}
          </div>
          <p className={styles.lead}>{request.statusHint}</p>
        </div>
        {request.canClose && (
          <button type="button" onClick={markResolved} className={styles.secondary}>
            Mark as resolved
          </button>
        )}
      </header>

      {notice && <p className={styles.err}>{notice}</p>}

      {request.description && (
        <section className={styles.panel} aria-label="Your original request">
          <p className={styles.eyebrow}>Your request</p>
          <p className={styles.itemText}>{request.description}</p>
        </section>
      )}

      <section className={styles.panel}>
        <RequestThread
          viewer="client"
          messages={thread}
          canReply={request.canReply}
          closedNote="This request is resolved. Submit a new request if you need anything else."
          onSend={send}
        />
      </section>

      {activity.length > 0 && (
        <section className={styles.panel} aria-label="Request history">
          <p className={styles.eyebrow}>History</p>
          <ul className={styles.list}>
            {activity.map((a) => (
              <li key={a.id} className={styles.item}>
                <p className={styles.itemText}>{a.summary}</p>
                <div className={styles.itemMeta}>
                  <span>{formatDay(a.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
