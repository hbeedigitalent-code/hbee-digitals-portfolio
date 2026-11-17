// src/app/admin/requests/[id]/page.tsx
//
// Admin request detail: the thread (public replies and internal notes, visually distinct), status control,
// project association, jumps to the client and project, and the full activity history.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import RequestThread, { type ThreadMessage } from '@/components/requests/RequestThread'
import { REQUEST_STATUS_LABELS, REQUEST_STATUSES, type RequestStatus } from '@/lib/requests/request-status'

interface Detail {
  request: { id: string; title: string; description: string | null; status: RequestStatus; createdAt: string }
  client: { id: string; name: string; status: string | null; connected: boolean } | null
  project: { id: string; project_name: string | null; project_id: string | null; status: string | null } | null
  clientProjects: Array<{ id: string; name: string }>
  messages: Array<ThreadMessage & { from: string }>
  activity: Array<{ id: string; actorRole: string; summary: string; visibility: string; createdAt: string }>
}

async function post(url: string, body?: unknown, method = 'POST') {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  return { ok: response.ok, payload }
}

export default function AdminRequestDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Detail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/requests/${params.id}`, { credentials: 'same-origin' })
      if (response.status === 404) return setState('missing')
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.request) return setState('error')
      setData(payload)
      setState('ready')
      if ((payload.messages || []).some((m: ThreadMessage) => m.unread)) post(`/api/admin/requests/${params.id}/read`).catch(() => undefined)
    } catch {
      setState('error')
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function send(input: { body: string; internal: boolean; clientKey: string }) {
    const { ok, payload } = await post(`/api/admin/requests/${params.id}/messages`, input)
    if (!ok) return payload?.error || 'The message could not be sent.'
    await load()
    return null
  }

  async function changeStatus(status: string) {
    setNotice(null)
    const { ok, payload } = await post(`/api/admin/requests/${params.id}/status`, { status })
    if (!ok) setNotice(payload?.error || 'The status could not be changed.')
    await load()
  }

  async function changeProject(projectId: string) {
    setNotice(null)
    const { ok, payload } = await post(`/api/admin/requests/${params.id}`, { project_id: projectId || null }, 'PATCH')
    if (!ok) setNotice(payload?.error || 'The project could not be changed.')
    await load()
  }

  if (state === 'loading') return <p className="text-sm text-[var(--text-muted)]">Loading request…</p>
  if (state === 'missing') return <p className="text-[var(--text-muted)]">Request not found. <Link href="/admin/requests" className="underline">Back to requests</Link></p>
  if (state === 'error' || !data) {
    return (
      <div role="alert" className="rounded-xl border border-[var(--error)] p-4 text-sm text-[var(--error)]">
        This request could not be loaded. <button type="button" onClick={load} className="underline">Try again</button>
      </div>
    )
  }

  const { request, client, project, clientProjects, messages, activity } = data

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/requests" className="text-sm text-[var(--text-muted)] hover:underline">← All requests</Link>
        <h1 className="mt-1 break-words text-2xl font-bold text-[var(--text-primary)]">{request.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
          {client && <Link href={`/admin/client-portal/${client.id}`} className="hover:underline">{client.name}</Link>}
          {client && !client.connected && <span>Not connected to a business</span>}
          {project && <Link href={`/admin/projects/${project.id}`} className="hover:underline">{project.project_name || project.project_id || 'Project'}</Link>}
        </div>
      </div>

      {notice && <p role="alert" className="rounded-lg border border-[var(--error)] p-3 text-sm text-[var(--error)]">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {request.description && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">Original request</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-[var(--text-secondary)]">{request.description}</p>
            </section>
          )}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <RequestThread viewer="admin" messages={messages} canReply allowInternal onSend={send} />
          </section>
        </div>

        <aside className="min-w-0 space-y-4">
          <section className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label htmlFor="req-status" className="text-sm font-semibold text-[var(--text-primary)]">Status</label>
            <select id="req-status" value={request.status} onChange={(e) => changeStatus(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-[var(--text-primary)]">
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)]">A public reply sets “Answered”. A client reply to an answered request re-opens it. Internal notes change nothing.</p>
          </section>

          <section className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <label htmlFor="req-project" className="text-sm font-semibold text-[var(--text-primary)]">Project</label>
            <select id="req-project" value={project?.id ?? ''} onChange={(e) => changeProject(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 text-[var(--text-primary)]">
              <option value="">No project</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)]">Only this client’s own projects are offered.</p>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">History</h2>
            {activity.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">No activity yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm text-[var(--text-secondary)]">
                    <span className="break-words">{a.summary}</span>
                    <span className="block text-xs text-[var(--text-muted)]">
                      {new Date(a.createdAt).toLocaleString()} · {a.visibility === 'internal' ? 'internal' : 'client-visible'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
