// src/lib/client-portal/overview-model.ts
//
// Pure. Everything the Client Portal Overview DERIVES from the dashboard payload it already receives (/api/client-portal/dashboard).
// No I/O, no new data and no new API: it decides what to show first and how it is labelled, nothing more.
//
// HIERARCHY (see OverviewView): welcome · Current Engagement · Needs your attention · Your workspace · Recent activity + Growth snapshot.
// The workspace tiles carry STATUS WORDS drawn from data the payload already holds (an awaiting proposal, a payment due, a reply waiting).
// They never carry counts: the payload has no true totals, so a number would be a guess.

import type { ActiveProject, ActivityItem, AttentionItem, CurrentPriority, GrowthSnapshot, ProposalCard } from './dashboard'
import { INVOICE_OVERDUE_LABEL } from './attention-labels'
import { needsFromYou, statusExplanation, statusTone } from './projects-display'
import { toneFromProjectTone, type PortalTone } from './portal-status'
import type { PortalNavIcon } from '@/components/client-portal/portal-nav'

export interface DashboardData {
  client: { firstName: string | null; businessName: string | null }
  priority: CurrentPriority | null
  growth: { state: string; snapshot: GrowthSnapshot | null }
  attention: AttentionItem[]
  activeWork: { history: boolean; projects: ActiveProject[] }
  activity: ActivityItem[]
  files: Array<{ id: string; name: string | null; type: string | null; size: number | null; uploadedAt: string | null }>
  deliverables: Array<{ id: string; title: string | null; version: string | null; uploadedAt: string | null }>
  proposal: ProposalCard | null
  unavailable: string[]
}

// ── formatting (moved unchanged from the previous page) ──────────────────────────────────────────────────────────────────
export function greeting(date: Date): string {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function fmtDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ago(value: string | null | undefined, now: number = Date.now()): string {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const mins = Math.round((now - t) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return fmtDate(value) || ''
}

export function money(total: number | null, currency: string | null): string | null {
  if (total === null) return null
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(total)
  } catch {
    return `${currency || 'USD'} ${total.toLocaleString()}`
  }
}

// ── Current Engagement ───────────────────────────────────────────────────────────────────────────────────────────────────
export interface Engagement {
  /** The primary project (the newest active one, or the most recent completed one when none is active). */
  project: ActiveProject | null
  /** Other active projects, shown only as a quiet link. */
  others: ActiveProject[]
  /** True when `project` is the most recent COMPLETED project because nothing is active. */
  history: boolean
}

export function engagementOf(data: Pick<DashboardData, 'activeWork'>): Engagement {
  const [project = null, ...others] = data.activeWork.projects
  return { project, others, history: data.activeWork.history && project !== null }
}

export function projectTone(status: string | null | undefined): PortalTone {
  return toneFromProjectTone(statusTone(status))
}

/** One line under the progress: what the client must do (only the two statuses that mean it), else a neutral explanation of the stored status. */
export function nextStep(status: string | null | undefined): { label: string; text: string } | null {
  const needs = needsFromYou(status)
  if (needs) return { label: 'Needs from you', text: needs.text }
  const text = statusExplanation(status)
  return text ? { label: 'What happens next', text } : null
}

export interface DocumentChip {
  kind: 'proposal' | 'invoice'
  title: string
  detail: string
  href: string
  tone: PortalTone
  statusLabel: string
}

const isOverdueItem = (item: AttentionItem) => item.kind === 'invoice' && item.context.startsWith(INVOICE_OVERDUE_LABEL)

/**
 * The proposal awaiting a decision and the open invoice, as document chips — only when they exist. They come from data the payload already carries (the open
 * proposal card, and the invoice attention item), so they are the client's open documents, not a claim that Hbee has linked them to this one project.
 */
export function documentChips(data: Pick<DashboardData, 'proposal' | 'attention'>): DocumentChip[] {
  const out: DocumentChip[] = []
  if (data.proposal) {
    const p = data.proposal
    const total = money(p.total, p.currency)
    const sent = fmtDate(p.sentAt)
    out.push({
      kind: 'proposal',
      title: p.title,
      detail: [total, sent ? `Sent ${sent}` : null].filter(Boolean).join(' · ') || 'Awaiting your response',
      href: `/client-portal/proposals/${p.id}`,
      tone: 'needs-you',
      statusLabel: 'Awaiting you',
    })
  }
  const invoice = data.attention.find((a) => a.kind === 'invoice')
  if (invoice) {
    const overdue = isOverdueItem(invoice)
    out.push({ kind: 'invoice', title: invoice.title, detail: invoice.context, href: invoice.href, tone: overdue ? 'alert' : 'needs-you', statusLabel: overdue ? 'Overdue' : 'Payment due' })
  }
  return out
}

// ── Needs your attention ─────────────────────────────────────────────────────────────────────────────────────────────────
export const ATTENTION_LIMIT = 3

export interface AttentionRow {
  key: string
  kind: AttentionItem['kind']
  title: string
  context: string
  href: string
  tone: PortalTone
  actionLabel: string
}

const ACTION_LABEL: Record<AttentionItem['kind'], string> = { request: 'Reply', proposal: 'Review', invoice: 'View', project: 'Open' }

/** At most three rows, in the order the server already ranked them (overdue invoice, answered request, proposal, other invoice, project). Every row is something the client must do; only an overdue invoice is an alert. */
export function attentionRows(items: AttentionItem[]): AttentionRow[] {
  return items.slice(0, ATTENTION_LIMIT).map((a, i) => ({
    key: `${a.kind}-${i}-${a.href}`,
    kind: a.kind,
    title: a.title,
    context: a.context,
    href: a.href,
    tone: isOverdueItem(a) ? 'alert' : 'needs-you',
    actionLabel: ACTION_LABEL[a.kind],
  }))
}

// ── Your workspace ───────────────────────────────────────────────────────────────────────────────────────────────────────
export interface WorkspaceTile {
  key: 'projects' | 'requests' | 'proposals' | 'invoices' | 'files' | 'growth-profile'
  label: string
  href: string
  icon: PortalNavIcon
  /** Status words. NEVER a count. */
  line: string
  /** Set when the line is a status (it is then drawn with PortalStatus: shape + words); undefined for a plain descriptor. */
  tone?: PortalTone
}

export function workspaceTiles(data: DashboardData): WorkspaceTile[] {
  const engagement = engagementOf(data)
  const invoice = data.attention.find((a) => a.kind === 'invoice')
  const replied = data.attention.some((a) => a.kind === 'request')
  const latestDeliverable = data.deliverables[0]?.title?.trim()
  const latestFile = data.files[0]?.name?.trim()
  const snap = data.growth.snapshot

  const growthLine = snap ? [snap.score !== null ? `HGRI ${snap.score}` : null, snap.classification].filter(Boolean).join(' · ') : ''

  return [
    engagement.project
      ? { key: 'projects', label: 'Projects', href: '/client-portal/projects', icon: 'projects', line: engagement.history ? 'Completed' : engagement.project.status, tone: projectTone(engagement.project.status) }
      : { key: 'projects', label: 'Projects', href: '/client-portal/projects', icon: 'projects', line: 'Everything Hbee is building for you' },
    replied
      ? { key: 'requests', label: 'Requests', href: '/client-portal/requests', icon: 'requests', line: 'Hbee replied', tone: 'needs-you' }
      : { key: 'requests', label: 'Requests', href: '/client-portal/requests', icon: 'requests', line: 'Ask Hbee or follow up' },
    data.proposal
      ? { key: 'proposals', label: 'Proposals', href: '/client-portal/proposals', icon: 'proposals', line: 'Awaiting your response', tone: 'needs-you' }
      : { key: 'proposals', label: 'Proposals', href: '/client-portal/proposals', icon: 'proposals', line: 'Review and approve' },
    invoice
      ? { key: 'invoices', label: 'Invoices', href: '/client-portal/invoices', icon: 'invoices', line: isOverdueItem(invoice) ? 'Overdue' : 'Payment due', tone: isOverdueItem(invoice) ? 'alert' : 'needs-you' }
      : { key: 'invoices', label: 'Invoices', href: '/client-portal/invoices', icon: 'invoices', line: 'Billing and payments' },
    { key: 'files', label: 'Files', href: '/client-portal/files', icon: 'files', line: latestDeliverable ? `Latest: ${latestDeliverable}` : latestFile ? `Latest: ${latestFile}` : 'Shared files and deliverables' },
    { key: 'growth-profile', label: 'Growth Profile', href: '/client-portal/growth-profile', icon: 'growth-profile', line: growthLine || 'Your growth snapshot' },
  ]
}

// ── Recent activity ──────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ActivityRow {
  key: string
  title: string
  meta: string
  href: string | null
}

export function activityRows(items: ActivityItem[], now: number = Date.now()): ActivityRow[] {
  return items.map((a, i) => ({ key: `${a.type}-${i}-${a.at}`, title: a.title, meta: [a.context, ago(a.at, now)].filter(Boolean).join(' · '), href: a.href }))
}

export const ACTIVITY_MOBILE_LIMIT = 4
