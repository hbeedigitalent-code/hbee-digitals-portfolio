// src/components/admin/CommerceSummary.tsx
//
// Admin client detail and project detail: a compact, READ-ONLY summary of the commercial documents, with direct links, so Admin does
// not have to jump between the Proposals, Invoices and Projects lists. It reads two Admin API routes and renders what they return;
// it creates, changes, issues and voids nothing. A section that could not be read is named as such, never shown as "none".

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatMoney } from '@/lib/commerce/money'
import { proposalStatusLabel } from '@/lib/proposal-status'

interface Inv {
  id: string; number: string | null; status: string; displayStatus: string; statusLabel: string
  currency: string; total: string; balance: string; dueDate: string | null; projectName?: string | null
}
interface Prop { id: string; number: string | null; title: string; status: string; currency: string | null; total: string | null }
interface Proj { id: string; reference: string | null; name: string; status: string }
interface Outstanding { currency: string; balance: string; invoices: number }

interface ClientData {
  projects: { total: number; latest: Proj[] }
  proposals: { total: number; awaitingClient: number; approved: number; latest: Prop[] }
  invoices: { total: number; outstanding: Outstanding[]; latest: Inv[] }
  unavailable: string[]
}
interface ProjectData { proposals: Prop[]; invoices: Inv[]; outstanding: Outstanding[]; unavailable: string[] }

const shell = 'rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6'
const h3 = 'text-sm font-semibold text-[var(--text-primary)]'
const row = 'flex flex-wrap items-center justify-between gap-2'
const linkCls = 'min-w-0 break-words text-sm text-[var(--text-primary)] hover:underline'
const muted = 'text-xs text-[var(--text-muted)]'

function Owing({ outstanding }: { outstanding: Outstanding[] }) {
  if (outstanding.length === 0) return <p className={muted}>Nothing outstanding.</p>
  return (
    <p className="text-sm text-[var(--text-secondary)]">
      Outstanding: {outstanding.map((o) => `${formatMoney(o.balance, o.currency)} (${o.invoices} ${o.invoices === 1 ? 'invoice' : 'invoices'})`).join(' · ')}
    </p>
  )
}

function InvoiceRows({ invoices }: { invoices: Inv[] }) {
  return (
    <ul className="space-y-2">
      {invoices.map((i) => (
        <li key={i.id} className={row}>
          <Link href={`/admin/invoices/${i.id}`} className={linkCls}>{i.number || 'Invoice'}{i.projectName ? ` · ${i.projectName}` : ''}</Link>
          <span className={muted}>
            {i.statusLabel} · {formatMoney(i.total, i.currency)}
            {(i.status === 'issued' || i.status === 'partially_paid') && ` · balance ${formatMoney(i.balance, i.currency)}`}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ProposalRows({ proposals }: { proposals: Prop[] }) {
  return (
    <ul className="space-y-2">
      {proposals.map((p) => (
        <li key={p.id} className={row}>
          <Link href={`/admin/proposals/${p.id}`} className={linkCls}>{p.number ? `${p.number} · ` : ''}{p.title}</Link>
          <span className={muted}>{proposalStatusLabel(p.status)}{p.total && p.currency ? ` · ${formatMoney(p.total, p.currency)}` : ''}</span>
        </li>
      ))}
    </ul>
  )
}

export default function CommerceSummary(props: { clientId: string } | { projectId: string }) {
  const clientId = 'clientId' in props ? props.clientId : null
  const projectId = 'projectId' in props ? props.projectId : null
  const [data, setData] = useState<ClientData | ProjectData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    const url = clientId ? `/api/admin/clients/${encodeURIComponent(clientId)}/commerce` : `/api/admin/projects/${encodeURIComponent(String(projectId))}/commerce`
    fetch(url, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [clientId, projectId])

  if (failed) return <div role="alert" className={shell + ' text-sm text-[var(--error)]'}>Proposals and invoices could not be loaded.</div>
  if (!data) return <div className={shell + ' text-sm text-[var(--text-muted)]'}>Loading proposals and invoices…</div>

  const warn = data.unavailable.length > 0 && (
    <p role="alert" className="text-xs text-[var(--error)]">Could not read: {data.unavailable.join(', ')}. What is shown may be incomplete.</p>
  )

  if (projectId) {
    const d = data as ProjectData
    return (
      <div className={shell + ' space-y-4'} data-commerce-summary="project">
        <h3 className={h3}>Proposal &amp; billing</h3>
        {warn}
        <div className="space-y-2">
          <p className={muted}>Proposal</p>
          {d.proposals.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No proposal is linked to this project.</p> : <ProposalRows proposals={d.proposals} />}
        </div>
        <div className="space-y-2">
          <p className={muted}>Invoices ({d.invoices.length})</p>
          {d.invoices.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No invoices for this project.</p> : <InvoiceRows invoices={d.invoices} />}
          <Owing outstanding={d.outstanding} />
        </div>
      </div>
    )
  }

  const d = data as ClientData
  return (
    <div className={shell + ' space-y-5'} data-commerce-summary="client">
      <h3 className={h3}>Proposals, projects &amp; invoices</h3>
      {warn}
      <div className="space-y-2">
        <div className={row}>
          <p className={muted}>Projects ({d.projects.total})</p>
        </div>
        {d.projects.latest.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {d.projects.latest.map((p) => (
              <li key={p.id} className={row}>
                <Link href={`/admin/projects/${p.id}`} className={linkCls}>{p.name}</Link>
                <span className={muted}>{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2">
        <div className={row}>
          <p className={muted}>Proposals ({d.proposals.total}) · {d.proposals.awaitingClient} awaiting the client · {d.proposals.approved} approved</p>
          <Link href="/admin/proposals" className="text-xs text-[var(--accent)] hover:underline">All proposals</Link>
        </div>
        {d.proposals.latest.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No proposals yet.</p> : <ProposalRows proposals={d.proposals.latest} />}
      </div>
      <div className="space-y-2">
        <div className={row}>
          <p className={muted}>Invoices ({d.invoices.total})</p>
          <Link href="/admin/invoices" className="text-xs text-[var(--accent)] hover:underline">All invoices</Link>
        </div>
        {d.invoices.latest.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No invoices yet.</p> : <InvoiceRows invoices={d.invoices.latest} />}
        <Owing outstanding={d.invoices.outstanding} />
      </div>
    </div>
  )
}
