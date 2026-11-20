// src/app/admin/invoices/page.tsx
//
// Admin invoices: list with status filters (overdue is DERIVED from the due date), balances from the payment ledger, and a
// "new invoice" form for a client project (an invoice from an APPROVED PROPOSAL is created from that proposal's page, because it
// copies the approved version). All reads and writes go through /api/admin/invoices*; no Supabase call is made from the browser.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CURRENCIES, formatMoney } from '@/lib/commerce/money'

interface Row { id: string; number: string; status: string; displayStatus: string; statusLabel: string; currency: string; total: string; paid: string; balance: string; dueDate: string | null; projectName: string | null; clientName: string | null }
interface ApprovedRef { id: string; number: string | null }
interface Project { id: string; project_name: string | null; project_id: string | null; client?: { business_name: string | null; full_name: string | null } | null }

const FILTERS = [['', 'All'], ['draft', 'Draft'], ['issued', 'Issued'], ['partially_paid', 'Partially paid'], ['overdue', 'Overdue'], ['paid', 'Paid'], ['void', 'Void']] as const
const field = 'min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]'

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [due, setDue] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<ApprovedRef | null>(null)
  const [approvedByProject, setApprovedByProject] = useState<Record<string, ApprovedRef>>({})
  // the proposal this project came from (known up front, or returned by the server's 409)
  const approvedProposal = blocked || (projectId ? approvedByProject[projectId] : undefined) || null

  const load = useCallback(async () => {
    setState('loading')
    try {
      const r = await fetch(`/api/admin/invoices${filter ? `?status=${filter}` : ''}`, { credentials: 'same-origin' })
      const p = await r.json().catch(() => null)
      if (!r.ok || !Array.isArray(p?.invoices)) return setState('error')
      setRows(p.invoices); setState('ready')
    } catch { setState('error') }
  }, [filter])
  useEffect(() => { load() }, [load])

  async function openForm() {
    setOpen(true)
    if (projects.length) return
    const r = await fetch('/api/admin/projects?scope=client', { credentials: 'same-origin' })
    const p = await r.json().catch(() => null)
    if (r.ok && Array.isArray(p?.projects)) setProjects(p.projects)
    // Best effort, for an early warning only: which projects came from an approved proposal. The server check stays authoritative.
    try {
      const pr = await fetch('/api/admin/proposals', { credentials: 'same-origin', cache: 'no-store' })
      const pp = await pr.json().catch(() => null)
      if (pr.ok && Array.isArray(pp?.proposals)) {
        const map: Record<string, ApprovedRef> = {}
        for (const x of pp.proposals) if (x?.status === 'approved' && x.approved_version && x.converted_to_project_id && !map[x.converted_to_project_id]) map[x.converted_to_project_id] = { id: x.id, number: x.proposal_number ?? null }
        setApprovedByProject(map)
      }
    } catch { /* the server guard still applies */ }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBlocked(null)
    const r = await fetch('/api/admin/invoices', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: projectId, currency, due_date: due || undefined }) })
    const p = await r.json().catch(() => null)
    if (r.status === 409 && p?.code === 'approved_proposal_exists' && typeof p?.proposal_id === 'string') return setBlocked({ id: p.proposal_id, number: p.proposal_number ?? null })
    if (!r.ok) return setMsg(p?.message || p?.error || 'The invoice could not be created.')
    window.location.href = `/admin/invoices/${p.invoice.id}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Invoices</h1>
        <button type="button" onClick={openForm} className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white">New invoice</button>
      </div>

      {open && (
        <form onSubmit={create} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:grid-cols-[1fr_8rem_11rem_auto]">
          <select aria-label="Client project" value={projectId} onChange={(e) => { setProjectId(e.target.value); setBlocked(null); setMsg(null) }} className={field} required>
            <option value="">Choose a client project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{(p.client?.business_name || p.client?.full_name || 'Client')} — {p.project_name || p.project_id}</option>)}
          </select>
          <select aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={field}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          <input aria-label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
          <button type="submit" disabled={!!approvedProposal} className="min-h-[44px] rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-50">Create draft</button>
          {approvedProposal && (
            <div role="alert" className="rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)] sm:col-span-4">
              <p>This project has an approved proposal. Create the invoice from that proposal so the approved line items and pricing are carried over.</p>
              <Link href={`/admin/proposals/${approvedProposal.id}`} className="mt-2 inline-block font-semibold underline">Open approved proposal{approvedProposal.number ? ` ${approvedProposal.number}` : ''}</Link>
            </div>
          )}
          {msg && <p role="alert" className="text-sm text-[var(--error)] sm:col-span-4">{msg}</p>}
          <p className="text-xs text-[var(--text-muted)] sm:col-span-4">To invoice an approved proposal, open the proposal and use “Create invoice from this proposal”: it copies the approved version.</p>
        </form>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter invoices">
        {FILTERS.map(([k, label]) => (
          <button key={k || 'all'} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={'min-h-[40px] rounded-full border px-3 py-1 text-sm ' + (filter === k ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)]')}>{label}</button>
        ))}
      </div>

      {state === 'loading' && <p className="text-sm text-[var(--text-muted)]">Loading invoices…</p>}
      {state === 'error' && <p role="alert" className="text-sm text-[var(--error)]">Invoices could not be loaded. <button type="button" className="underline" onClick={load}>Try again</button></p>}
      {state === 'ready' && rows.length === 0 && <p className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">No invoices in this view.</p>}
      {state === 'ready' && rows.length > 0 && (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <Link href={`/admin/invoices/${r.id}`} className="font-semibold text-[var(--text-primary)] hover:underline">{r.number}</Link>
                <p className="break-words text-sm text-[var(--text-muted)]">{[r.clientName, r.projectName].filter(Boolean).join(' · ')}{r.dueDate ? ` · due ${r.dueDate}` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-[var(--text-secondary)]">{formatMoney(r.total, r.currency)}{r.status !== 'draft' && r.status !== 'void' ? ` · balance ${formatMoney(r.balance, r.currency)}` : ''}</span>
                <span className={'rounded-full border px-3 py-1 text-xs font-semibold ' + (r.displayStatus === 'overdue' ? 'border-[var(--error)] text-[var(--error)]' : 'border-[var(--border)] text-[var(--text-secondary)]')}>{r.statusLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
