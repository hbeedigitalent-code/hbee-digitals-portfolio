// src/components/admin/ClientOperationsSummary.tsx
//
// Admin client detail: this client's requests and recent activity, read through the Admin API routes only.
// A failed read is shown as a failure, never as "nothing here".

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { REQUEST_STATUS_LABELS, type RequestStatus } from '@/lib/requests/request-status'

interface Req { id: string; title: string; status: RequestStatus; lastActivityAt: string; unreadFromClient: number }
interface Ev { id: string; summary: string; visibility: string; requestId: string | null; projectId: string | null; createdAt: string }

export default function ClientOperationsSummary({ clientId }: { clientId: string }) {
  const [requests, setRequests] = useState<Req[] | null>(null)
  const [events, setEvents] = useState<Ev[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all([
      fetch(`/api/admin/requests?client_id=${encodeURIComponent(clientId)}`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/admin/clients/${encodeURIComponent(clientId)}/activity`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([r, a]) => {
        if (!live) return
        setRequests(r.requests || [])
        setEvents(a.events || [])
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [clientId])

  const shell = 'rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6'
  if (failed) return <div role="alert" className={shell + ' text-sm text-[var(--error)]'}>Requests and activity could not be loaded.</div>
  if (!requests || !events) return <div className={shell + ' text-sm text-[var(--text-muted)]'}>Loading requests and activity…</div>

  return (
    <>
      <div className={shell}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Requests ({requests.length})</h3>
          <Link href={`/admin/requests?client_id=${clientId}`} className="text-sm text-[var(--accent)] hover:underline">Inbox</Link>
        </div>
        {requests.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No requests yet</p>
        ) : (
          <ul className="space-y-2">
            {requests.slice(0, 8).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/admin/requests/${r.id}`} className="min-w-0 break-words text-sm text-[var(--text-primary)] hover:underline">{r.title}</Link>
                <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  {r.unreadFromClient > 0 && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 font-bold text-white">{r.unreadFromClient} new</span>}
                  {REQUEST_STATUS_LABELS[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={shell}>
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Recent activity</h3>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No activity recorded yet</p>
        ) : (
          <ul className="space-y-2">
            {events.slice(0, 12).map((e) => (
              <li key={e.id} className="text-sm text-[var(--text-secondary)]">
                <span className="break-words">{e.summary}</span>
                <span className="block text-xs text-[var(--text-muted)]">{new Date(e.createdAt).toLocaleString()} · {e.visibility === 'internal' ? 'internal' : 'client-visible'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
