// src/app/client-portal/proposals/[id]/page.tsx
//
// One proposal, as the client must be able to rely on it (S6.4).
//
//   * It shows the immutable VERSION the client was sent (the approved version once approved) — scope, deliverables, timeline,
//     line-item pricing, subtotal / discount / total in the proposal's own currency, payment terms and terms — and offers the PDF
//     of exactly that version.
//   * The three decisions are separate, explicit actions. Approve and Decline need a ticked confirmation; Approve names the
//     version being approved and the server refuses it if the proposal has been revised since this page loaded. Request changes
//     needs a message, which is stored durably against this version.
//   * Nothing here computes or sends a price, a status, a client id or a project id: the page sends only the version number, the
//     confirmation and the client's own words.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { proposalStatusLabel } from '@/lib/proposal-status'
import { formatMoney } from '@/lib/commerce/money'
import { formatDay } from '@/lib/client-portal/support-display'
import support from '@/components/client-portal/support.module.css'
import styles from '@/components/client-portal/commerce.module.css'

interface Doc {
  proposal: {
    id: string; number: string; title: string; status: string; displayStatus: string; currency: string; version: number; shownVersion: number; approvedVersion: number | null
    converted: boolean; projectId: string | null; summary: string | null; scope: string | null; deliverables: string | null; timeline: string | null; terms: string | null; paymentTerms: string | null
    issueDate: string | null; expiresAt: string | null; sentAt: string | null; acceptedAt: string | null; declinedAt: string | null; subtotal: string; discount: string; total: string
    lines: Array<{ title: string; description?: string | null; quantity: string; unit_price: string; amount: string }>
  }
  files: Array<{ id: string; file_name: string; file_size: number | null }>
  responses: Array<{ id: string; version_number: number; response_type: string; message: string | null; created_at: string; resolved_at: string | null; resolved_in_version: number | null }>
  canDecide: boolean
  expired: boolean
}

type Mode = null | 'approve' | 'changes' | 'decline'
type LoadState = 'loading' | 'ready' | 'ambiguous' | 'missing' | 'error'

function newKey() { try { return crypto.randomUUID() } catch { return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}` } }

export default function ClientProposalDetailPage({ params }: { params: { id: string } }) {
  const [state, setState] = useState<LoadState>('loading')
  const [doc, setDoc] = useState<Doc | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [key] = useState(newKey)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/client-portal/proposals/${params.id}`, { credentials: 'same-origin' })
      if (r.status === 409) return setState('ambiguous')
      if (r.status === 404) return setState('missing')
      const p = await r.json().catch(() => null)
      if (!r.ok || !p?.proposal) return setState('error')
      setDoc(p); setState('ready')
      if (p.proposal.status === 'sent') fetch(`/api/client-portal/proposals/${params.id}/viewed`, { method: 'POST', credentials: 'same-origin' }).catch(() => undefined)
    } catch { setState('error') }
  }, [params.id])
  useEffect(() => { load() }, [load])

  async function decide(action: 'approve' | 'request-changes' | 'decline') {
    if (!doc) return
    setBusy(true); setNotice(null)
    const body =
      action === 'approve' ? { version: doc.proposal.version, confirm: true }
      : action === 'decline' ? { confirm: true, note: text }
      : { reason: text, clientKey: key }
    try {
      const r = await fetch(`/api/client-portal/proposals/${params.id}/${action}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const p = await r.json().catch(() => null)
      if (!r.ok) {
        setNotice({ kind: 'err', text: p?.error || 'That could not be completed. Please try again.' })
        if (p?.code === 'version_mismatch' || p?.code === 'not_allowed') await load()
        return
      }
      setMode(null); setConfirmed(false); setText('')
      setNotice({ kind: 'ok', text: action === 'approve' ? 'Thank you — the proposal is approved. Hbee Digitals has been notified and will set up your project.' : action === 'decline' ? 'You have declined this proposal. Hbee Digitals has been notified.' : 'Your request has been sent. Hbee Digitals will send a revised proposal.' })
      await load()
    } catch { setNotice({ kind: 'err', text: 'That could not be completed. Check your connection and try again.' }) } finally { setBusy(false) }
  }

  async function download(id: string) {
    setNotice(null)
    try {
      const r = await fetch(`/api/client-portal/proposals/${params.id}/files/${id}/signed-url`, { credentials: 'same-origin' })
      const p = await r.json().catch(() => null)
      if (!r.ok || !p?.url) return setNotice({ kind: 'err', text: 'Could not generate a download link.' })
      window.open(p.url, '_blank', 'noopener,noreferrer')
    } catch { setNotice({ kind: 'err', text: 'Could not generate a download link.' }) }
  }

  if (state === 'loading') return <SupportLoading />
  if (state === 'ambiguous') return <SupportAmbiguous what="proposals" />
  if (state === 'error') return <SupportError message="We could not load this proposal. Please try again in a moment." onRetry={load} />
  if (state === 'missing' || !doc) {
    return (
      <div className={support.page}><section className={`${support.panel} ${support.center}`}><div className={support.centerBody}><h2>Proposal not found</h2><Link href="/client-portal/proposals" className={support.link}>Back to proposals</Link></div></section></div>
    )
  }

  const p = doc.proposal
  const label = proposalStatusLabel(doc.expired ? 'expired' : p.displayStatus)

  return (
    <div className={support.page}>
      <header className={support.head}>
        <div>
          <Link href="/client-portal/proposals" className={support.link}><ArrowLeft aria-hidden="true" /> All proposals</Link>
          <h1 className={support.h1}>{p.title}</h1>
          <div className={styles.meta}>
            <span className={support.chip}>{label}</span>
            <span>{p.number} · version {p.shownVersion}</span>
            {p.sentAt && <span>Sent {formatDay(p.sentAt)}</span>}
            {p.expiresAt && <span>{doc.expired ? 'Expired' : 'Valid until'} {formatDay(p.expiresAt)}</span>}
          </div>
        </div>
        <a className={support.secondary} href={`/api/client-portal/proposals/${p.id}/pdf`} target="_blank" rel="noopener noreferrer"><Download aria-hidden="true" /> Download PDF</a>
      </header>

      {notice && <p role="status" className={notice.kind === 'ok' ? support.ok : support.err}>{notice.text}</p>}

      <section className={`${support.panel} ${styles.doc}`}>
        {p.summary && <div className={styles.section}><h2 className={styles.sectionTitle}>Summary</h2><p className={styles.prose}>{p.summary}</p></div>}
        {p.scope && <div className={styles.section}><h2 className={styles.sectionTitle}>Scope</h2><p className={styles.prose}>{p.scope}</p></div>}
        {p.deliverables && <div className={styles.section}><h2 className={styles.sectionTitle}>Deliverables</h2><p className={styles.prose}>{p.deliverables}</p></div>}
        {p.timeline && <div className={styles.section}><h2 className={styles.sectionTitle}>Timeline</h2><p className={styles.prose}>{p.timeline}</p></div>}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Investment</h2>
          <div className={styles.head} aria-hidden="true"><span>Item</span><span>Qty</span><span>Unit price</span><span>Amount</span></div>
          <ul className={styles.lines}>
            {p.lines.map((l, i) => (
              <li key={i} className={styles.line}>
                <span className={styles.lineTitle}>{l.title}</span>
                <span className={styles.lineAmt}>{formatMoney(l.amount, p.currency)}</span>
                {l.description && <span className={styles.lineDesc}>{l.description}</span>}
                <span className={styles.lineQty}>Qty {Number(l.quantity)} × {formatMoney(l.unit_price, p.currency)}</span>
                <span className={styles.lineUnit}>{formatMoney(l.unit_price, p.currency)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.totals}>
            <div className={styles.totalRow}><span>Subtotal</span><span>{formatMoney(p.subtotal, p.currency)}</span></div>
            {Number(p.discount) > 0 && <div className={styles.totalRow}><span>Discount</span><span>-{formatMoney(p.discount, p.currency)}</span></div>}
            <div className={`${styles.totalRow} ${styles.totalStrong}`}><span>Total ({p.currency})</span><span>{formatMoney(p.total, p.currency)}</span></div>
          </div>
        </div>

        {p.paymentTerms && <div className={styles.section}><h2 className={styles.sectionTitle}>Payment terms</h2><p className={styles.prose}>{p.paymentTerms}</p></div>}
        {p.terms && <div className={styles.section}><h2 className={styles.sectionTitle}>Terms</h2><p className={styles.prose}>{p.terms}</p></div>}

        {doc.files.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Attachments</h2>
            <ul className={styles.files}>
              {doc.files.map((f) => (
                <li key={f.id} className={styles.file}>
                  <span className={styles.fileName}><FileText aria-hidden="true" size={16} /> {f.file_name}</span>
                  <button type="button" className={support.link} onClick={() => download(f.id)}>Download</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {doc.responses.length > 0 && (
        <section className={support.panel} aria-label="Your responses">
          <p className={styles.sectionTitle}>Your responses</p>
          {doc.responses.map((r) => (
            <div key={r.id} className={styles.note}>
              <strong>{r.response_type === 'declined' ? 'Declined' : 'Changes requested'}</strong> · version {r.version_number} · {formatDay(r.created_at)}
              {r.response_type === 'changes_requested' && (r.resolved_at ? ` · addressed in version ${r.resolved_in_version}` : ' · awaiting a revision from Hbee')}
              {r.message ? `\n${r.message}` : ''}
            </div>
          ))}
        </section>
      )}

      {p.displayStatus === 'approved' && (
        <p className={support.ok}>
          You approved version {p.approvedVersion ?? p.shownVersion}{p.acceptedAt ? ` on ${formatDay(p.acceptedAt)}` : ''}.{' '}
          {p.converted && p.projectId ? <Link href={`/client-portal/projects/${p.projectId}`} className={support.link}>Open your project</Link> : 'Hbee Digitals will set up your project.'}
        </p>
      )}
      {p.displayStatus === 'declined' && <p className={support.warn}>This proposal was declined{p.declinedAt ? ` on ${formatDay(p.declinedAt)}` : ''}.</p>}
      {p.displayStatus === 'changes_requested' && <p className={support.warn}>You asked for changes. Hbee Digitals will send a revised version; it cannot be approved until then.</p>}
      {doc.expired && <p className={support.warn}>This proposal&rsquo;s validity period has ended. Please contact Hbee Digitals if you would like to revisit it.</p>}

      {doc.canDecide && (
        <section className={styles.actions} aria-label="Your decision">
          {mode === null && (
            <div className={styles.actionRow}>
              <button type="button" className={support.primary} onClick={() => { setMode('approve'); setNotice(null) }}>Approve this proposal</button>
              <button type="button" className={support.secondary} onClick={() => { setMode('changes'); setNotice(null) }}>Request changes</button>
              <button type="button" className={`${support.secondary} ${styles.danger}`} onClick={() => { setMode('decline'); setNotice(null) }}>Decline</button>
            </div>
          )}
          {mode === 'approve' && (
            <>
              <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I approve version {p.version} of proposal {p.number}, for {formatMoney(p.total, p.currency)}.</label>
              <div className={styles.actionRow}>
                <button type="button" className={support.primary} disabled={!confirmed || busy} onClick={() => decide('approve')}>{busy ? 'Approving…' : 'Confirm approval'}</button>
                <button type="button" className={support.secondary} disabled={busy} onClick={() => { setMode(null); setConfirmed(false) }}>Cancel</button>
              </div>
            </>
          )}
          {mode === 'changes' && (
            <>
              <label className={support.label} htmlFor="chg">What would you like changed?</label>
              <textarea id="chg" className={support.textarea} rows={4} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
              <div className={styles.actionRow}>
                <button type="button" className={support.primary} disabled={!text.trim() || busy} onClick={() => decide('request-changes')}>{busy ? 'Sending…' : 'Send request'}</button>
                <button type="button" className={support.secondary} disabled={busy} onClick={() => { setMode(null); setText('') }}>Cancel</button>
              </div>
            </>
          )}
          {mode === 'decline' && (
            <>
              <label className={support.label} htmlFor="dec">Anything you would like to tell us? (optional)</label>
              <textarea id="dec" className={support.textarea} rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
              <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> I want to decline this proposal. I understand Hbee would need to send a new one.</label>
              <div className={styles.actionRow}>
                <button type="button" className={`${support.primary} ${styles.danger}`} disabled={!confirmed || busy} onClick={() => decide('decline')}>{busy ? 'Declining…' : 'Confirm decline'}</button>
                <button type="button" className={support.secondary} disabled={busy} onClick={() => { setMode(null); setConfirmed(false); setText('') }}>Cancel</button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
