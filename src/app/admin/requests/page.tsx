// src/app/admin/requests/page.tsx
//
// The Admin Request Inbox. One session-gated endpoint (/api/admin/requests); the page holds no privileged
// access of its own. Filters are sent to the server and re-read, so the list is always the database's answer.
// On narrow screens the table collapses to cards (no horizontal scroll).

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { REQUEST_STATUS_LABELS, REQUEST_STATUSES, type RequestStatus } from '@/lib/requests/request-status'

interface Row {
  id: string
  title: string
  status: RequestStatus
  clientId: string
  clientName: string
  projectId: string | null
  projectName: string | null
  createdAt: string
  lastActivityAt: string
  unreadFromClient: number
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'active', label: 'Needs attention' },
  ...REQUEST_STATUSES.map((s) => ({ key: s, label: REQUEST_STATUS_LABELS[s] })),
  { key: '', label: 'All' },
]

function day(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState('active')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [truncated, setTruncated] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const qs = new URLSearchParams()
      if (status) qs.set('status', status)
      if (search) qs.set('q', search)
      // Deep links from a client / project page: ?client_id=… and ?project_id=…
      const here = new URLSearchParams(window.location.search)
      for (const key of ['client_id', 'project_id']) {
        const v = here.get(key)
        if (v) qs.set(key, v)
      }
      const response = await fetch(`/api/admin/requests?${qs.toString()}`, { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.requests)) return setState('error')
      setRows(payload.requests)
      setTruncated(payload.truncated === true)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [status, search])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Requests</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(q.trim())
          }}
          className="flex w-full gap-2 sm:w-auto"
        >
          <label htmlFor="req-search" className="sr-only">
            Search requests or clients
          </label>
          <input
            id="req-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or client"
            className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] sm:w-64"
          />
          <button type="submit" className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter requests by status">
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            type="button"
            onClick={() => setStatus(f.key)}
            aria-pressed={status === f.key}
            className={'min-h-[40px] rounded-full border px-3 py-1 text-sm ' + (status === f.key ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {state === 'loading' && <p className="text-sm text-[var(--text-muted)]">Loading requests…</p>}
      {state === 'error' && (
        <div role="alert" className="rounded-xl border border-[var(--error)] p-4 text-sm text-[var(--error)]">
          The request list could not be loaded. <button type="button" onClick={load} className="underline">Try again</button>
        </div>
      )}

      {state === 'ready' && rows.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-10 text-center text-[var(--text-muted)]">No requests match this view.</div>
      )}

      {state === 'ready' && rows.length > 0 && (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <Link href={`/admin/requests/${r.id}`} className="block break-words text-base font-semibold text-[var(--text-primary)] hover:underline">
                  {r.title}
                </Link>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                  <Link href={`/admin/client-portal/${r.clientId}`} className="break-words hover:underline">{r.clientName}</Link>
                  {r.projectId && (
                    <Link href={`/admin/projects/${r.projectId}`} className="break-words hover:underline">
                      {r.projectName || 'Project'}
                    </Link>
                  )}
                  <span>Updated {day(r.lastActivityAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.unreadFromClient > 0 && (
                  <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">{r.unreadFromClient} new</span>
                )}
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">{REQUEST_STATUS_LABELS[r.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {truncated && <p className="text-sm text-[var(--text-muted)]">Showing the 300 most recently active requests. Narrow the search to see others.</p>}
    </div>
  )
}
