// src/lib/client-portal/proposal-display.ts
//
// Pure display helpers for the Client Portal proposal pages (Phase 18.4). No I/O, no
// state. Everything here formats or classifies fields the proposal APIs already return —
// nothing is derived that the data does not support.

export interface ProposalPricing {
  total?: number | string | null
  currency?: string | null
  payment_terms?: string | null
}

/** The only statuses the client APIs expose. */
export const VISIBLE_STATUSES = ['sent', 'viewed', 'approved', 'changes_requested'] as const

/** The client has not yet responded (status only — see isProposalActionable for expiry). */
export function needsReview(status: string): boolean {
  return status === 'sent' || status === 'viewed'
}

/**
 * THE expiry rule, shared by the approve and request-changes routes, the dashboard and both
 * proposal pages. A proposal is EXPIRED for client actions when it is still sent or viewed,
 * has an expires_at, and that moment has passed. This is derived — nothing is stored — and it
 * never applies to approved or changes_requested proposals.
 */
export function isProposalExpired(
  p: { status: string; expires_at: string | null | undefined },
  now: number | Date = Date.now(),
): boolean {
  if (!needsReview(p.status) || !p.expires_at) return false
  const t = new Date(p.expires_at).getTime()
  const n = now instanceof Date ? now.getTime() : now
  return Number.isFinite(t) && t < n
}

/** The client can still approve or request changes: sent/viewed and not expired. */
export function isProposalActionable(
  p: { status: string; expires_at: string | null | undefined },
  now: number | Date = Date.now(),
): boolean {
  return needsReview(p.status) && !isProposalExpired(p, now)
}

/** The status to present: a derived 'expired' for an expired sent/viewed proposal. */
export function displayStatus(
  p: { status: string; expires_at: string | null | undefined },
  now: number | Date = Date.now(),
): string {
  return isProposalExpired(p, now) ? 'expired' : p.status
}

export type ProposalFilter = 'all' | 'review' | 'approved' | 'changes' | 'expired'

export const FILTERS: Array<{ key: ProposalFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'review', label: 'Needs review' },
  { key: 'approved', label: 'Approved' },
  { key: 'changes', label: 'Changes requested' },
  { key: 'expired', label: 'Expired' },
]

export function matchesFilter(
  p: { status: string; expires_at: string | null | undefined },
  filter: ProposalFilter,
  now: number | Date = Date.now(),
): boolean {
  if (filter === 'all') return true
  if (filter === 'review') return isProposalActionable(p, now)
  if (filter === 'expired') return isProposalExpired(p, now)
  if (filter === 'approved') return p.status === 'approved'
  return p.status === 'changes_requested'
}

function validTotal(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Money in the proposal's own currency, or null when there is no real figure. */
export function formatMoney(value: unknown, currency: string | null | undefined): string | null {
  const n = validTotal(value)
  if (n === null) return null
  const code = currency || 'USD'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(n)
  } catch {
    return `${code} ${n.toLocaleString()}`
  }
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** True when the proposal has an expiry date that has already passed. */
export function isPastDate(value: string | null | undefined, now = Date.now()): boolean {
  if (!value) return false
  const t = new Date(value).getTime()
  return Number.isFinite(t) && t < now
}

export type ChipTone = 'info' | 'approved' | 'changes' | 'expired'

export function statusTone(status: string): ChipTone {
  if (status === 'approved') return 'approved'
  if (status === 'changes_requested') return 'changes'
  if (status === 'expired') return 'expired'
  return 'info'
}

export interface LifecycleStep {
  name: string
  done: boolean
  date: string | null
}

/**
 * A restrained lifecycle from REAL data only: Sent → Viewed → Approved / Changes requested.
 * Dates are shown only where a real timestamp exists (sent_at, accepted_at). The API returns
 * no viewed-at timestamp, so Viewed never carries a date.
 */
export function lifecycle(p: { status: string; sent_at: string | null; accepted_at: string | null; expires_at?: string | null }): LifecycleStep[] {
  const expired = isProposalExpired({ status: p.status, expires_at: p.expires_at })
  const viewed = p.status === 'viewed' || p.status === 'approved' || p.status === 'changes_requested'
  const decided = p.status === 'approved' || p.status === 'changes_requested'
  return [
    { name: 'Sent', done: true, date: formatDate(p.sent_at) },
    { name: 'Viewed', done: viewed, date: null },
    expired
      ? { name: 'Expired', done: true, date: formatDate(p.expires_at) }
      : {
          name: p.status === 'changes_requested' ? 'Changes requested' : p.status === 'approved' ? 'Approved' : 'Your decision',
          done: decided,
          date: p.status === 'approved' ? formatDate(p.accepted_at) : null,
        },
  ]
}
