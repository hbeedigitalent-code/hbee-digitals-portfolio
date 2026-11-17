// src/components/admin/ProjectOperationsPanel.tsx
//
// The Admin's project operations: details, milestones, deliverables and delivery team, all through the
// /api/admin/projects/[project_id]/* routes (session + 2FA + active admin on the server). Nothing here talks to
// Supabase directly. Every list is the database's answer re-read after each change, never optimistic state.

'use client'

import { useCallback, useEffect, useState } from 'react'

interface Milestone { id: string; title: string; description: string | null; status: string | null; due_date: string | null; sort_order: number }
interface Deliverable { id: string; title: string; description: string | null; version: string | null; status: string; due_date: string | null; hasFile: boolean }
interface TeamMember { adminUserId: string; label: string; you: boolean }

const card = 'rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3'
const input = 'min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]'
const btn = 'min-h-[44px] rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-50'
const primary = 'min-h-[44px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50'

async function call(url: string, method: string, body?: unknown): Promise<{ ok: boolean; payload: any }> {
  try {
    const response = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { ok: response.ok, payload: await response.json().catch(() => null) }
  } catch {
    return { ok: false, payload: { error: 'Network error. Please try again.' } }
  }
}

export default function ProjectOperationsPanel({ projectId, initialName, initialDescription }: { projectId: string; initialName: string; initialDescription: string }) {
  const base = `/api/admin/projects/${projectId}`
  const [msg, setMsg] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [assignable, setAssignable] = useState<TeamMember[]>([])
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [mTitle, setMTitle] = useState('')
  const [mDue, setMDue] = useState('')
  const [dTitle, setDTitle] = useState('')
  const [dFile, setDFile] = useState('')
  const [dStatus, setDStatus] = useState('ready')
  const [pick, setPick] = useState('')

  const reload = useCallback(async () => {
    const [m, d, t] = await Promise.all([call(`${base}/milestones`, 'GET'), call(`${base}/deliverables`, 'GET'), call(`${base}/team`, 'GET')])
    if (m.ok) setMilestones(m.payload.milestones || [])
    if (d.ok) { setDeliverables(d.payload.deliverables || []); setFiles(d.payload.attachableFiles || []) }
    if (t.ok) { setTeam(t.payload.team || []); setAssignable(t.payload.assignable || []) }
    if (!m.ok || !d.ok || !t.ok) setMsg('Some project data could not be loaded. If this is new, the S6.3 database migration may not be applied yet.')
  }, [base])

  useEffect(() => { reload() }, [reload])

  async function run(url: string, method: string, body?: unknown, done?: () => void) {
    setMsg(null)
    const { ok, payload } = await call(url, method, body)
    if (!ok) setMsg(payload?.error || 'That change could not be saved.')
    else done?.()
    await reload()
  }

  async function move(index: number, dir: -1 | 1) {
    const ids = milestones.map((m) => m.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    await run(`${base}/milestones/reorder`, 'POST', { orderedIds: ids })
  }

  return (
    <div className="space-y-6">
      {msg && <p role="alert" className="rounded-lg border border-[var(--error)] p-3 text-sm text-[var(--error)]">{msg}</p>}

      <section className={card} aria-labelledby="po-details">
        <h2 id="po-details" className="text-lg font-semibold text-[var(--text-primary)]">Details</h2>
        <label className="block text-sm text-[var(--text-muted)]">Project name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={input} />
        </label>
        <label className="block text-sm text-[var(--text-muted)]">Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={4000} className={input + ' py-2'} />
        </label>
        <button type="button" className={primary} onClick={() => run(base, 'PATCH', { project_name: name, description })}>Save details</button>
      </section>

      <section className={card} aria-labelledby="po-ms">
        <h2 id="po-ms" className="text-lg font-semibold text-[var(--text-primary)]">Milestones</h2>
        {milestones.length === 0 && <p className="text-sm text-[var(--text-muted)]">No milestones yet.</p>}
        <ol className="space-y-2">
          {milestones.map((m, i) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] p-3">
              <input type="checkbox" aria-label={`Mark "${m.title}" complete`} className="h-5 w-5" checked={(m.status || '').toLowerCase() === 'completed'} onChange={(e) => run(`${base}/milestones/${m.id}`, 'PATCH', { status: e.target.checked ? 'completed' : 'pending' })} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-[var(--text-primary)]">{m.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{m.due_date ? `Target ${m.due_date}` : 'No target date'}</p>
              </div>
              <button type="button" className={btn} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" className={btn} aria-label="Move down" disabled={i === milestones.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" className={btn} onClick={() => { if (confirm(`Delete milestone "${m.title}"?`)) run(`${base}/milestones/${m.id}`, 'DELETE') }}>Delete</button>
            </li>
          ))}
        </ol>
        <div className="grid gap-2 sm:grid-cols-[1fr_11rem_auto]">
          <input aria-label="New milestone title" placeholder="Milestone title" value={mTitle} onChange={(e) => setMTitle(e.target.value)} maxLength={140} className={input} />
          <input aria-label="Target date" type="date" value={mDue} onChange={(e) => setMDue(e.target.value)} className={input} />
          <button type="button" className={primary} disabled={mTitle.trim().length < 2} onClick={() => run(`${base}/milestones`, 'POST', { title: mTitle, due_date: mDue || null }, () => { setMTitle(''); setMDue('') })}>Add</button>
        </div>
      </section>

      <section className={card} aria-labelledby="po-del">
        <h2 id="po-del" className="text-lg font-semibold text-[var(--text-primary)]">Deliverables</h2>
        {deliverables.length === 0 && <p className="text-sm text-[var(--text-muted)]">No deliverables yet.</p>}
        <ul className="space-y-2">
          {deliverables.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] p-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-[var(--text-primary)]">{d.title}{d.version ? ` · ${d.version}` : ''}</p>
                <p className="text-xs text-[var(--text-muted)]">{d.hasFile ? 'File attached' : 'No file'}{d.status === 'draft' ? ' · hidden from client' : ''}</p>
              </div>
              <select aria-label={`Status of ${d.title}`} value={d.status} onChange={(e) => run(`${base}/deliverables/${d.id}`, 'PATCH', { status: e.target.value })} className={input + ' sm:w-36'}>
                {['draft', 'ready', 'delivered', 'revised'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" className={btn} onClick={() => { if (confirm(`Delete deliverable "${d.title}"? The file itself is kept.`)) run(`${base}/deliverables/${d.id}`, 'DELETE') }}>Delete</button>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="New deliverable title" placeholder="Deliverable title" value={dTitle} onChange={(e) => setDTitle(e.target.value)} maxLength={140} className={input} />
          <select aria-label="Attach a file" value={dFile} onChange={(e) => setDFile(e.target.value)} className={input}>
            <option value="">Choose a file (required)…</option>
            {files.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select aria-label="Initial status" value={dStatus} onChange={(e) => setDStatus(e.target.value)} className={input}>
            {['draft', 'ready', 'delivered', 'revised'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="button" className={primary} disabled={dTitle.trim().length < 2 || !dFile} onClick={() => run(`${base}/deliverables`, 'POST', { title: dTitle, status: dStatus, fileId: dFile }, () => { setDTitle(''); setDFile('') })}>Add deliverable</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Files come from the client’s uploaded files for this project. Clients download through a short-lived signed link only.</p>
      </section>

      <section className={card} aria-labelledby="po-team">
        <h2 id="po-team" className="text-lg font-semibold text-[var(--text-primary)]">Delivery team</h2>
        {team.length === 0 && <p className="text-sm text-[var(--text-muted)]">Nobody is assigned yet.</p>}
        <ul className="space-y-2">
          {team.map((t) => (
            <li key={t.adminUserId} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-3">
              <span className="flex-1 text-sm text-[var(--text-primary)]">{t.label}{t.you ? ' (you)' : ''}</span>
              <button type="button" className={btn} onClick={() => run(`${base}/team`, 'DELETE', { admin_user_id: t.adminUserId })}>Remove</button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Assign a team member" value={pick} onChange={(e) => setPick(e.target.value)} className={input + ' sm:w-72'}>
            <option value="">Choose a team member…</option>
            {assignable.map((a) => <option key={a.adminUserId} value={a.adminUserId}>{a.label}{a.you ? ' (you)' : ''}</option>)}
          </select>
          <button type="button" className={primary} disabled={!pick} onClick={() => run(`${base}/team`, 'POST', { admin_user_id: pick }, () => setPick(''))}>Assign</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Clients are only told how many Hbee people are on their project; names and emails are not shown to them.</p>
      </section>
    </div>
  )
}
