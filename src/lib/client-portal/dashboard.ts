// src/lib/client-portal/dashboard.ts
//
// Pure derivation for the Client Portal Home. No I/O and no Supabase here — the
// route (src/app/api/client-portal/dashboard/route.ts) does the session-bound reads
// and hands plain rows to these functions, which keeps every rule below testable.
//
// RULE: nothing is invented. Each value returned comes from a real field, or is a
// direct derivation of real fields (the lowest pillar; "needs attention" from real
// statuses). There is no stage, milestone, "latest update" or message data, because
// none of those exist in the backend.

import { isProposalActionable } from './proposal-display'
import { displayGrowthClassification } from '@/lib/growth-classification'
import { parseProgress } from './projects-display'
import { formatMoney } from '@/lib/commerce/money'
import { isActionableInvoice, type InvoiceSummary } from '@/lib/commerce/summaries'
import { formatDay } from './support-display'

export const PILLAR_ORDER = ['visibility', 'conversion', 'retention', 'authority', 'scalability'] as const
export type PillarKey = (typeof PILLAR_ORDER)[number]

export const PILLAR_LABELS: Record<PillarKey, string> = {
  visibility: 'Visibility',
  conversion: 'Conversion',
  retention: 'Retention',
  authority: 'Authority',
  scalability: 'Scalability',
}

/** Heading shown for the current growth area, per pillar. */
export const PRIORITY_HEADINGS: Record<PillarKey, string> = {
  visibility: 'Strengthen visibility',
  conversion: 'Improve conversion',
  retention: 'Strengthen retention',
  authority: 'Build authority',
  scalability: 'Improve scalability',
}

// ── Growth Profile ──────────────────────────────────────────────────

export interface ReleasedProfile {
  hgri_score: number | null
  growth_classification: string | null
  pillars: Record<string, number> | null
  recommendations: string[]
}

export interface PillarValue {
  key: PillarKey
  label: string
  value: number
}

export function profilePillars(profile: Pick<ReleasedProfile, 'pillars'>): PillarValue[] {
  return PILLAR_ORDER.filter((k) => typeof profile.pillars?.[k] === 'number' && Number.isFinite(profile.pillars![k])).map(
    (k) => ({ key: k, label: PILLAR_LABELS[k], value: profile.pillars![k] as number }),
  )
}

/**
 * The lowest of the real pillar values. Needs two or more pillars to compare and is
 * not named when every pillar is equal. Ties go to the first pillar in canonical order.
 */
export function lowestPillar(pillars: PillarValue[]): PillarValue | null {
  if (pillars.length < 2) return null
  const min = Math.min(...pillars.map((p) => p.value))
  const max = Math.max(...pillars.map((p) => p.value))
  if (min === max) return null
  return pillars.find((p) => p.value === min) ?? null
}

export interface CurrentPriority {
  pillar: PillarKey
  label: string
  heading: string
  score: number
  /** First recommendation, shown as general guidance — NOT as belonging to this pillar. */
  recommendation: string | null
}

export function deriveCurrentPriority(profile: ReleasedProfile): CurrentPriority | null {
  const low = lowestPillar(profilePillars(profile))
  if (!low) return null
  return {
    pillar: low.key,
    label: low.label,
    heading: PRIORITY_HEADINGS[low.key],
    score: low.value,
    recommendation: profile.recommendations[0] ?? null,
  }
}

export interface GrowthSnapshot {
  score: number | null
  classification: string | null
  pillars: PillarValue[]
  lowestKey: PillarKey | null
}

export function deriveSnapshot(profile: ReleasedProfile): GrowthSnapshot {
  const pillars = profilePillars(profile)
  return {
    score: typeof profile.hgri_score === 'number' ? profile.hgri_score : null,
    classification: displayGrowthClassification(profile.growth_classification),
    pillars,
    lowestKey: lowestPillar(pillars)?.key ?? null,
  }
}

// ── Links ───────────────────────────────────────────────────────────

/** Only same-origin portal paths may leave the server as a link. */
export function safePortalLink(link: unknown): string | null {
  if (typeof link !== 'string') return null
  if (link !== '/client-portal' && !link.startsWith('/client-portal/')) return null
  if (link.includes('//') || link.includes('\\') || link.includes(':')) return null
  return link
}

// ── Projects ────────────────────────────────────────────────────────

export interface ProjectRow {
  id: string
  project_id: string | null
  project_name: string | null
  status: string | null
  progress: number | string | null
  description: string | null
  start_date: string | null
  expected_completion_date: string | null
  created_at?: string | null
}

export interface ActiveProject {
  id: string
  code: string | null
  name: string
  status: string
  /** The stored progress 0–100, or null when it is not set (null is NOT zero). */
  progress: number | null
  description: string | null
  startDate: string | null
  expectedCompletion: string | null
}

const INACTIVE = new Set(['completed', 'archived'])
const isInactive = (status: string | null) => INACTIVE.has((status || '').trim().toLowerCase())

function shortText(value: string | null, max = 280): string | null {
  const t = (value || '').trim()
  if (!t) return null
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

function toActive(p: ProjectRow): ActiveProject {
  return {
    id: p.id,
    code: p.project_id || null,
    name: (p.project_name || '').trim() || 'Untitled project',
    status: (p.status || '').trim() || 'New',
    progress: parseProgress(p.progress),
    description: shortText(p.description),
    startDate: p.start_date || null,
    expectedCompletion: p.expected_completion_date || null,
  }
}

/**
 * Active work: projects that are neither Completed nor Archived (newest first, at most
 * two). If there are none, the most recent completed project may appear as history —
 * flagged, so the page can say so. Archived projects are never shown.
 */
export function selectActiveWork(projects: ProjectRow[]): { history: boolean; projects: ActiveProject[] } {
  const byNewest = [...projects].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  const active = byNewest.filter((p) => !isInactive(p.status))
  if (active.length > 0) return { history: false, projects: active.slice(0, 2).map(toActive) }
  const lastDone = byNewest.find((p) => (p.status || '').trim().toLowerCase() === 'completed')
  return { history: true, projects: lastDone ? [toActive(lastDone)] : [] }
}

// ── Needs your attention ────────────────────────────────────────────

export interface ProposalRow {
  id: string
  proposal_number?: string | null
  title: string | null
  status: string | null
  pricing: { total?: number | string | null; currency?: string | null } | null
  expires_at: string | null
  sent_at: string | null
  created_at: string | null
}

export interface NotificationRow {
  id: string
  type?: string | null
  title: string | null
  message: string | null
  link: string | null
  entity_type?: string | null
  entity_id?: string | null
  created_at: string
  read_at: string | null
}

export interface AttentionItem {
  kind: 'proposal' | 'project' | 'request' | 'invoice'
  title: string
  context: string
  href: string
}

/** A proposal the client still has to respond to: sent or viewed, and not past its expiry. */
export function isAwaitingResponse(p: ProposalRow, now: Date): boolean {
  return isProposalActionable({ status: (p.status || '').toLowerCase(), expires_at: p.expires_at }, now)
}

const PROJECT_ATTENTION: Record<string, string> = {
  'awaiting client feedback': 'Awaiting your feedback',
  'assets required': 'Assets needed from you',
}

/** A concise line for one open invoice: status, what is owed and when. Existing money and date formatting only. */
export function invoiceItem(inv: InvoiceSummary): AttentionItem {
  const balance = formatMoney(inv.balance, inv.currency)
  const due = formatDay(inv.dueDate)
  const context =
    inv.displayStatus === 'overdue'
      ? `Overdue · ${balance} to pay${due ? ` · was due ${due}` : ''}`
      : inv.status === 'partially_paid'
        ? `Partially paid · ${balance} left${due ? ` · due ${due}` : ''}`
        : `Payment due · ${balance}${due ? ` · due ${due}` : ''}`
  return { kind: 'invoice', title: `Invoice ${inv.number || ''}`.trim(), context, href: `/client-portal/invoices/${inv.id}` }
}

/**
 * The most useful one to three items, in this priority order:
 *   1. OVERDUE invoices (issued / partially paid, balance owing, past the due date),
 *   2. requests Hbee has answered,
 *   3. proposals awaiting a response (sent / viewed, not past expiry),
 *   4. other open invoices (issued / partially paid, balance owing),
 *   5. projects whose real status is Awaiting Client Feedback or Assets Required.
 * Draft, paid and void invoices never qualify.
 * Nothing else qualifies. In particular, notifications never produce an item here: the
 * known types (growth_profile_ready, proposal_approved, proposal_changes_requested …) are
 * informational, so an unread notification is not evidence that the client must act.
 * They remain visible in Recent Activity. Completed and archived projects, anything
 * Hbee-internal and changes the client has already requested never produce an item.
 */
export function buildAttention(input: {
  proposals: ProposalRow[]
  projects: ProjectRow[]
  now: Date
  /** S6.3: requests Hbee has answered and the client has not yet replied to or closed. Real rows only. */
  answeredRequests?: Array<{ id: string; title: string | null }>
  /** Finalization: the client's delivered invoices. Only those that ask something of the client (issued / partially paid, balance owing) ever produce an item; draft, paid and void never do. */
  invoices?: InvoiceSummary[]
  max?: number
}): AttentionItem[] {
  const max = input.max ?? 3
  const out: AttentionItem[] = []
  const actionable = (input.invoices ?? []).filter(isActionableInvoice)

  // An OVERDUE invoice is the most time-critical thing on the page: it leads. Other open invoices follow the client's decisions.
  for (const inv of actionable.filter((i) => i.displayStatus === 'overdue')) out.push(invoiceItem(inv))

  for (const r of input.answeredRequests ?? []) {
    out.push({
      kind: 'request',
      title: (r.title || '').trim() || 'Request',
      context: 'Hbee replied to your request',
      href: `/client-portal/requests/${r.id}`,
    })
  }

  for (const p of input.proposals.filter((p) => isAwaitingResponse(p, input.now))) {
    out.push({
      kind: 'proposal',
      title: (p.title || '').trim() || 'Proposal',
      context: (p.status || '').toLowerCase() === 'viewed' ? 'Proposal awaiting your response' : 'New proposal from Hbee',
      href: `/client-portal/proposals/${p.id}`,
    })
  }

  for (const inv of actionable.filter((i) => i.displayStatus !== 'overdue')) out.push(invoiceItem(inv))

  for (const proj of input.projects) {
    const text = PROJECT_ATTENTION[(proj.status || '').trim().toLowerCase()]
    if (!text) continue
    out.push({
      kind: 'project',
      title: (proj.project_name || '').trim() || 'Project',
      context: text,
      href: `/client-portal/projects/${proj.id}`,
    })
  }

  return out.slice(0, max)
}

// ── Recent activity ─────────────────────────────────────────────────

export interface FileRow {
  id: string
  file_name: string | null
  file_type: string | null
  file_size: number | string | null
  uploaded_at: string | null
  project_id: string | null
}

export interface DeliverableRow {
  id: string
  title: string | null
  version: string | null
  uploaded_at: string | null
  project_id: string | null
}

export interface ActivityItem {
  type: 'update' | 'file' | 'deliverable' | 'proposal'
  title: string
  context: string | null
  at: string
  href: string | null
}

function validTime(value: string | null | undefined): number | null {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : null
}

/**
 * A chronological feed from real timestamped rows only: notifications, files,
 * deliverables and proposal send dates. Newest first, never padded. A file,
 * deliverable or proposal that a notification already announces is not listed twice.
 */
/** A client-visible activity_events row (S6.3). Internal events never reach this type: the route filters them. */
export interface EventRow {
  id: string
  summary: string | null
  created_at: string | null
  request_id: string | null
  project_id: string | null
}

export function buildActivity(input: {
  notifications: NotificationRow[]
  files: FileRow[]
  deliverables: DeliverableRow[]
  proposals: ProposalRow[]
  events?: EventRow[]
  max?: number
}): ActivityItem[] {
  const max = input.max ?? 5
  const announced = new Set(
    input.notifications.filter((n) => n.entity_type && n.entity_id).map((n) => `${n.entity_type}:${n.entity_id}`),
  )
  const items: Array<ActivityItem & { t: number }> = []

  for (const n of input.notifications) {
    const t = validTime(n.created_at)
    const title = (n.title || '').trim()
    if (t === null || !title) continue
    items.push({ type: 'update', title, context: shortText(n.message, 120), at: n.created_at, href: safePortalLink(n.link), t })
  }
  for (const f of input.files) {
    const t = validTime(f.uploaded_at)
    if (t === null || !f.file_name || announced.has(`file:${f.id}`) || announced.has(`project_file:${f.id}`)) continue
    items.push({ type: 'file', title: f.file_name, context: 'File added', at: f.uploaded_at!, href: '/client-portal/files', t })
  }
  for (const d of input.deliverables) {
    const t = validTime(d.uploaded_at)
    if (t === null || !d.title || announced.has(`deliverable:${d.id}`) || announced.has(`project_deliverable:${d.id}`)) continue
    items.push({ type: 'deliverable', title: d.title, context: 'Deliverable available', at: d.uploaded_at!, href: '/client-portal/files', t })
  }
  // S6.3: real workflow events. One that a notification already announces (same destination within two
  // minutes) is not listed twice.
  const notified = input.notifications
    .map((n) => ({ href: safePortalLink(n.link), t: validTime(n.created_at) }))
    .filter((n): n is { href: string; t: number } => !!n.href && n.t !== null)
  for (const e of input.events ?? []) {
    const t = validTime(e.created_at)
    const title = (e.summary || '').trim()
    if (t === null || !title) continue
    const href = e.request_id ? `/client-portal/requests/${e.request_id}` : e.project_id ? `/client-portal/projects/${e.project_id}` : null
    if (href && notified.some((n) => n.href === href && Math.abs(n.t - t) < 120000)) continue
    items.push({ type: 'update', title, context: null, at: e.created_at!, href, t })
  }
  for (const p of input.proposals) {
    const t = validTime(p.sent_at)
    if (t === null || announced.has(`proposal:${p.id}`)) continue
    items.push({
      type: 'proposal',
      title: (p.title || '').trim() || 'Proposal',
      context: 'Proposal sent',
      at: p.sent_at!,
      href: `/client-portal/proposals/${p.id}`,
      t,
    })
  }

  return items
    .sort((a, b) => b.t - a.t)
    .slice(0, max)
    .map(({ t: _t, ...rest }) => rest)
}

// ── Open proposal card ──────────────────────────────────────────────

export interface ProposalCard {
  id: string
  title: string
  status: string
  total: number | null
  currency: string | null
  sentAt: string | null
  expiresAt: string | null
}

/** The most recent proposal awaiting a response, or null — no card without one. */
export function selectOpenProposal(proposals: ProposalRow[], now: Date): ProposalCard | null {
  const open = proposals
    .filter((p) => isAwaitingResponse(p, now))
    .sort((a, b) => String(b.sent_at || b.created_at || '').localeCompare(String(a.sent_at || a.created_at || '')))[0]
  if (!open) return null
  const total = Number(open.pricing?.total)
  return {
    id: open.id,
    title: (open.title || '').trim() || 'Proposal',
    status: (open.status || '').toLowerCase(),
    total: open.pricing?.total !== null && open.pricing?.total !== undefined && Number.isFinite(total) ? total : null,
    currency: open.pricing?.currency || null,
    sentAt: open.sent_at,
    expiresAt: open.expires_at,
  }
}
