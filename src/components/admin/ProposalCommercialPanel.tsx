// src/components/admin/ProposalCommercialPanel.tsx
//
// The Admin's commercial view of one proposal: what the client sees (the version snapshot), every version sent, the client's
// responses (change requests and declines, with their text — Admin only), conversion to a project, and invoicing. It talks only
// to the Admin routes; there is no browser-side write to Supabase here.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMoney } from '@/lib/commerce/money'

interface Panel {
  proposal: { id: string; number: string; status: string; displayStatus: string; currency: string; shownVersion: number; version: number; approvedVersion: number | null; converted: boolean; projectId: string | null; subtotal: string; discount: string; total: string; lines: Array<{ title: string; description?: string | null; quantity: string; unit_price: string; amount: string }>; isDraftPreview: boolean; expiresAt: string | null }
  versions: Array<{ id: string; version_number: number; total: string; currency: string; sent_at: string | null }>
  responses: Array<{ id: string; version_number: number; response_type: string; message: string | null; created_at: string; resolved_at: string | null; resolved_in_version: number | null }>
  invoices: Array<{ id: string; invoice_number: string; status: string; amount: string; currency: string }>
}

const card = 'rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4'
const btn = 'min-h-[44px] rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60'
const day = (v: string | null) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export default function ProposalCommercialPanel({ proposalId, onChanged }: { proposalId: string; onChanged?: () => void }) {
  const [data, setData] = useState<Panel | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [due, setDue] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/proposals/${proposalId}`, { credentials: 'same-origin' })
      const p = await r.json().catch(() => null)
      if (!r.ok || !p?.proposal) return setState('error')
      setData(p)
      setState('ready')
    } catch {
      setState('error')
    }
  }, [proposalId])
  useEffect(() => { load() }, [load])

  async function post(url: string, body?: unknown) {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
      const p = await r.json().catch(() => null)
      if (!r.ok) { setMsg(p?.error || 'That could not be completed.'); return null }
      return p
    } catch {
      setMsg('That could not be completed. Check your connection.')
      return null
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading') return <div className={card + ' text-sm text-[var(--text-muted)]'}>Loading the commercial record…</div>
  if (state === 'error' || !data) return <div role="alert" className={card + ' text-sm text-[var(--error)]'}>The commercial record could not be loaded. <button type="button" onClick={load} className="underline">Try again</button></div>

  const p = data.proposal
  const approved = p.displayStatus === 'approved'
  const liveInvoice = data.invoices.find((i) => i.status !== 'void')

  async function convert() {
    const r = await post(`/api/admin/proposals/${proposalId}/convert`)
    if (r) { setMsg('Project created and linked.'); await load(); onChanged?.() }
  }
  async function invoice() {
    if (!p.projectId) return
    const r = await post('/api/admin/invoices', { project_id: p.projectId, proposal_id: proposalId, due_date: due || undefined })
    if (r?.invoice?.id) window.location.href = `/admin/invoices/${r.invoice.id}`
  }

  return (
    <section className={card + ' space-y-4'} aria-label="Commercial record">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Commercial record · version {p.shownVersion}{p.isDraftPreview ? ' (live draft)' : ''}
        </h2>
        <div className="flex flex-wrap gap-2">
          <a className={btn + ' inline-flex items-center'} href={`/api/admin/proposals/${proposalId}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF</a>
        </div>
      </div>
      {msg && <p role="status" className="rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">{msg}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-[var(--text-muted)]"><th className="py-1 pr-2">Item</th><th className="py-1 pr-2 text-right">Qty</th><th className="py-1 pr-2 text-right">Unit</th><th className="py-1 text-right">Amount</th></tr></thead>
          <tbody>
            {p.lines.map((l, i) => (
              <tr key={i} className="border-t border-[var(--border)] align-top">
                <td className="py-2 pr-2"><span className="break-words font-medium text-[var(--text-primary)]">{l.title}</span>{l.description ? <span className="block break-words text-xs text-[var(--text-muted)]">{l.description}</span> : null}</td>
                <td className="py-2 pr-2 text-right">{Number(l.quantity)}</td>
                <td className="py-2 pr-2 text-right">{formatMoney(l.unit_price, p.currency)}</td>
                <td className="py-2 text-right">{formatMoney(l.amount, p.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-[var(--text-muted)]">Subtotal</dt><dd className="text-right">{formatMoney(p.subtotal, p.currency)}</dd>
        {Number(p.discount) > 0 && (<><dt className="text-[var(--text-muted)]">Discount</dt><dd className="text-right">-{formatMoney(p.discount, p.currency)}</dd></>)}
        <dt className="font-semibold text-[var(--text-primary)]">Total</dt><dd className="text-right font-semibold text-[var(--text-primary)]">{formatMoney(p.total, p.currency)}</dd>
      </dl>

      {approved && !p.converted && (
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-sm text-[var(--text-secondary)]">Approved{p.approvedVersion ? ` (version ${p.approvedVersion})` : ''}, but not yet linked to a project. Converting creates exactly one client project; repeating it changes nothing.</p>
          <button type="button" disabled={busy} onClick={convert} className={btn + ' mt-2'}>Convert to project</button>
        </div>
      )}
      {approved && p.converted && p.projectId && (
        <div className="rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">
          Linked to a project. <Link href={`/admin/projects/${p.projectId}`} className="underline">Open the project</Link>
          {liveInvoice ? (<> · Invoice <Link href={`/admin/invoices/${liveInvoice.id}`} className="underline">{liveInvoice.invoice_number}</Link> ({liveInvoice.status})</>) : (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-xs text-[var(--text-muted)]">Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 block min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]" /></label>
              <button type="button" disabled={busy} onClick={invoice} className={btn}>Create invoice from this proposal</button>
            </div>
          )}
        </div>
      )}

      {data.versions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Versions sent</h3>
          <ul className="mt-1 space-y-1 text-sm text-[var(--text-secondary)]">
            {data.versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>Version {v.version_number} · sent {day(v.sent_at)} · {formatMoney(v.total, v.currency)}{p.approvedVersion === v.version_number ? ' · approved' : ''}</span>
                <a className="underline" href={`/api/admin/proposals/${proposalId}/pdf?version=${v.version_number}`} target="_blank" rel="noopener noreferrer">PDF</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.responses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Client responses</h3>
          <ul className="mt-1 space-y-2">
            {data.responses.map((r) => (
              <li key={r.id} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                <p className="text-xs text-[var(--text-muted)]">{r.response_type === 'declined' ? 'Declined' : 'Changes requested'} · version {r.version_number} · {day(r.created_at)}{r.resolved_at ? ` · addressed in version ${r.resolved_in_version}` : r.response_type === 'changes_requested' ? ' · open' : ''}</p>
                {r.message ? <p className="mt-1 whitespace-pre-wrap break-words text-[var(--text-secondary)]">{r.message}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
