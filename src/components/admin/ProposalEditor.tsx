// src/components/admin/ProposalEditor.tsx
//
// The Admin proposal editor (create + edit a DRAFT). Everything it submits goes to the Admin routes, which parse an allow-list and
// let the database compute the money. The running total shown here is an ESTIMATE for the person typing (exact integer
// arithmetic, see lib/commerce/money.ts) — the server recalculates and its figures are the ones that count; the page says so.
// Totals, status, version, client and merchant ids are never sent.

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CURRENCIES, formatMoney, isPlainMoney, isPlainQuantity, lineAmountMinor, minorToString, toMinor } from '@/lib/commerce/money'

interface Line { title: string; description: string; quantity: string; unit_price: string }
interface MerchantOption { id: string; business_name: string | null; has_client_portal_link?: boolean; profiles?: Array<{ id: string; hgri_score?: number | null }> }

const field = 'min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)]'
const area = field + ' py-2'
const label = 'block text-sm font-medium text-[var(--text-secondary)]'
const emptyLine = (): Line => ({ title: '', description: '', quantity: '1', unit_price: '' })

export default function ProposalEditor({ proposalId }: { proposalId?: string }) {
  const router = useRouter()
  const editing = !!proposalId
  const [merchants, setMerchants] = useState<MerchantOption[]>([])
  const [merchantId, setMerchantId] = useState('')
  const [profileId, setProfileId] = useState('')
  const [title, setTitle] = useState('')
  const [currency, setCurrency] = useState<string>('USD')
  const [summary, setSummary] = useState('')
  const [scope, setScope] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [timeline, setTimeline] = useState('')
  const [terms, setTerms] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [discount, setDiscount] = useState('0')
  const [expires, setExpires] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine()])
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        if (editing) {
          const r = await fetch(`/api/admin/proposals/${proposalId}`, { credentials: 'same-origin' })
          const p = await r.json().catch(() => null)
          if (!r.ok || !p?.draft) throw new Error()
          if (!live) return
          const d = p.draft
          setStatus(d.status); setTitle(d.title || ''); setCurrency(d.currency || 'USD'); setSummary(d.summary || ''); setScope(d.scope || ''); setDeliverables(d.deliverables || '')
          setTimeline(d.timeline || ''); setTerms(d.terms || ''); setPaymentTerms(d.payment_terms || ''); setDiscount(String(d.discount_amount ?? '0'))
          setExpires(d.expires_at ? String(d.expires_at).slice(0, 10) : ''); setNotes(p.internal?.notes || ''); setRevisionNote(p.internal?.revisionNote || '')
          setLines((p.draftLines || []).length ? p.draftLines.map((l: any) => ({ title: l.title, description: l.description || '', quantity: String(l.quantity), unit_price: String(l.unit_price) })) : [emptyLine()])
        } else {
          const r = await fetch('/api/admin/proposals/options', { credentials: 'same-origin' })
          const p = await r.json().catch(() => null)
          if (!r.ok || !Array.isArray(p?.merchants)) throw new Error()
          if (live) setMerchants(p.merchants)
        }
      } catch {
        if (live) setError('Could not load the form. Reload the page and try again.')
      } finally {
        if (live) setLoading(false)
      }
    })()
    return () => { live = false }
  }, [editing, proposalId])

  // ESTIMATE only: exact integer arithmetic, the same rounding rule as the database
  const estimate = useMemo(() => {
    let sub = 0n
    for (const l of lines) {
      const a = lineAmountMinor(l.quantity, l.unit_price)
      if (a !== null) sub += a
    }
    const d = isPlainMoney(discount) ? toMinor(discount) ?? 0n : 0n
    return { subtotal: minorToString(sub), discount: minorToString(d > sub ? sub : d), total: minorToString(sub - (d > sub ? sub : d)), invalidDiscount: d > sub }
  }, [lines, discount])

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) return setError('Give the proposal a title.')
    if (!editing && !merchantId) return setError('Choose the business this proposal is for.')
    const cleaned = lines.filter((l) => l.title.trim() || l.unit_price.trim())
    for (const [i, l] of cleaned.entries()) {
      if (!l.title.trim()) return setError(`Line ${i + 1} needs a title.`)
      if (!isPlainQuantity(l.quantity)) return setError(`Line ${i + 1}: the quantity must be greater than zero (up to 3 decimals).`)
      if (!isPlainMoney(l.unit_price)) return setError(`Line ${i + 1}: the unit price must be an amount with at most 2 decimals.`)
    }
    if (!isPlainMoney(discount || '0')) return setError('The discount must be an amount with at most 2 decimals.')
    setBusy(true)
    const body: Record<string, unknown> = {
      title, currency, summary, scope, deliverables, timeline, terms, payment_terms: paymentTerms, notes, discount_amount: discount || '0',
      expires_at: expires ? `${expires}T23:59:59.000Z` : '', line_items: cleaned,
    }
    if (editing && status === 'changes_requested') body.revision_note = revisionNote
    if (!editing) { body.merchant_id = merchantId; if (profileId) body.growth_profile_id = profileId }
    try {
      const response = await fetch(editing ? `/api/admin/proposals/${proposalId}` : '/api/admin/proposals', {
        method: editing ? 'PATCH' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) return setError(payload?.error || 'The proposal could not be saved.')
      router.push(`/admin/proposals/${editing ? proposalId : payload?.proposal?.id}`)
    } catch {
      setError('The proposal could not be saved. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading…</p>
  const selected = merchants.find((m) => m.id === merchantId)

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{editing ? 'Edit proposal draft' : 'New proposal'}</h1>
        <Link href={editing ? `/admin/proposals/${proposalId}` : '/admin/proposals'} className="text-sm text-[var(--text-muted)] hover:underline">Cancel</Link>
      </div>
      {error && <p role="alert" className="rounded-lg border border-[var(--error)] p-3 text-sm text-[var(--error)]">{error}</p>}
      {editing && status === 'changes_requested' && (
        <p className="rounded-lg border border-[var(--warning)] p-3 text-sm text-[var(--text-secondary)]">The client asked for changes. Edit, then send — it goes out as a new version; the version they saw is kept unchanged.</p>
      )}

      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        {!editing && (
          <>
            <label className={label}>Business
              <select value={merchantId} onChange={(e) => { setMerchantId(e.target.value); setProfileId('') }} className={field} required>
                <option value="">Choose a business…</option>
                {merchants.map((m) => <option key={m.id} value={m.id}>{m.business_name || 'Unnamed business'}{m.has_client_portal_link ? '' : ' (no portal account yet)'}</option>)}
              </select>
            </label>
            {selected && !selected.has_client_portal_link && <p className="text-xs text-[var(--warning)]">This business has no client portal account yet: you can save a draft, but it cannot be sent until one is linked.</p>}
            {selected && (selected.profiles || []).length > 0 && (
              <label className={label}>Growth profile (optional)
                <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className={field}>
                  <option value="">None</option>
                  {selected.profiles!.map((p) => <option key={p.id} value={p.id}>Profile {p.id.slice(0, 8)}{p.hgri_score != null ? ` · score ${p.hgri_score}` : ''}</option>)}
                </select>
              </label>
            )}
          </>
        )}
        <label className={label}>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={field} required /></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={label}>Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={field}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
          <label className={label}>Valid until<input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={field} /></label>
          <label className={label}>Discount ({currency})<input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className={field} /></label>
        </div>
        <label className={label}>Summary<textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={4000} className={area} /></label>
        <label className={label}>Scope<textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={5} className={area} /></label>
        <label className={label}>Deliverables<textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)} rows={4} className={area} /></label>
        <label className={label}>Timeline<textarea value={timeline} onChange={(e) => setTimeline(e.target.value)} rows={2} className={area} /></label>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4" aria-labelledby="lines-h">
        <h2 id="lines-h" className="text-lg font-semibold text-[var(--text-primary)]">Pricing</h2>
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-[1fr_6rem_8rem_auto]">
            <div className="space-y-2 sm:col-span-1">
              <input aria-label={`Line ${i + 1} title`} placeholder="Item" value={l.title} onChange={(e) => setLine(i, { title: e.target.value })} maxLength={200} className={field} />
              <input aria-label={`Line ${i + 1} description`} placeholder="Description (optional)" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} className={field} />
            </div>
            <input aria-label={`Line ${i + 1} quantity`} inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={field} />
            <input aria-label={`Line ${i + 1} unit price`} inputMode="decimal" placeholder="0.00" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} className={field} />
            <button type="button" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : [emptyLine()]))} className="min-h-[44px] rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-secondary)]" aria-label={`Remove line ${i + 1}`}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="min-h-[44px] rounded-lg border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-primary)]">Add a line</button>
        <dl className="ml-auto grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-[var(--text-muted)]">Subtotal</dt><dd className="text-right">{formatMoney(estimate.subtotal, currency)}</dd>
          <dt className="text-[var(--text-muted)]">Discount</dt><dd className="text-right">-{formatMoney(estimate.discount, currency)}</dd>
          <dt className="font-semibold text-[var(--text-primary)]">Total</dt><dd className="text-right font-semibold text-[var(--text-primary)]">{formatMoney(estimate.total, currency)}</dd>
        </dl>
        {estimate.invalidDiscount && <p className="text-xs text-[var(--error)]">The discount is more than the subtotal; it will be refused.</p>}
        <p className="text-xs text-[var(--text-muted)]">This is an estimate while you type. The server recalculates every amount from the lines when you save; its figures are the ones the client sees.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <label className={label}>Payment terms<textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} rows={2} className={area} /></label>
        <label className={label}>Terms<textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={5} className={area} /></label>
        {editing && status === 'changes_requested' && (
          <label className={label}>What changed (revision note, kept on file)<textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} rows={2} maxLength={2000} className={area} /></label>
        )}
        <label className={label}>Internal notes (never shown to the client or printed)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={4000} className={area} /></label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="min-h-[44px] rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : editing ? 'Save draft' : 'Create draft'}</button>
      </div>
    </form>
  )
}
