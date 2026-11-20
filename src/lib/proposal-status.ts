// src/lib/proposal-status.ts
//
// The single source of truth for proposal status values, labels, badge styles
// and allowed transitions.
//
// Batch P0. Before this, three vocabularies were live at once: the create route
// wrote lowercase 'draft'; the list page styled and filtered title-case
// 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Rejected' | 'Expired' (via the
// stale Proposal/ProposalStatus types in src/types/admin-crm.ts, whose shape no
// longer matches the table); and the detail page transitioned lowercase
// draft → sent → viewed → accepted | rejected. The result was that every
// proposal created through the current flow rendered with no badge style and
// was excluded from the Sent/Approved summary tiles.
//
// Everything now reads from here. `accepted` is NOT a stored status: the stored
// value is 'approved', displayed as "Approved". Rows created before this change
// may still carry legacy values — the helpers below degrade gracefully rather
// than throwing or rendering an unstyled badge.

export const PROPOSAL_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'approved',
  'changes_requested',
  'declined',
  'rejected', // LEGACY spelling of declined: still read and displayed, no longer written
  'expired',
] as const

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  approved: 'Approved',
  changes_requested: 'Changes Requested',
  declined: 'Declined',
  rejected: 'Declined',
  expired: 'Expired',
}

// Semantic theme tokens only — these resolve correctly in both light and dark.
export const PROPOSAL_STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: 'bg-[var(--bg-section)] text-[var(--text-secondary)]',
  sent: 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  viewed: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  approved: 'bg-[var(--success-subtle)] text-[var(--success)]',
  changes_requested: 'bg-[var(--warning-subtle)] text-[var(--warning)]',
  declined: 'bg-[var(--error-subtle)] text-[var(--error)]',
  rejected: 'bg-[var(--error-subtle)] text-[var(--error)]',
  expired: 'bg-[var(--bg-section)] text-[var(--text-muted)]',
}

const UNKNOWN_STATUS_STYLE = 'bg-[var(--bg-section)] text-[var(--text-secondary)]'

/**
 * Admin-driven transitions.
 *
 *   draft             → sent
 *   sent              → viewed
 *   viewed            → approved | changes_requested
 *   changes_requested → sent            (after the admin revises the proposal)
 *   approved / rejected / expired       terminal
 *
 * `rejected` has no inbound admin transition by design — it is reserved for a
 * client-driven decision in a later batch, and is kept here so existing rows
 * and future client actions still render and filter correctly.
 */
export const PROPOSAL_STATUS_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ['sent'],
  sent: ['viewed', 'approved', 'changes_requested', 'declined', 'expired'],
  viewed: ['approved', 'changes_requested', 'declined', 'expired'],
  approved: [], // terminal; "converted" is DERIVED (approved + converted_to_project_id), never a stored status
  changes_requested: ['sent'], // revise, then send again as a NEW version; it can never be approved directly
  declined: [],
  rejected: [],
  expired: [],
}

/**
 * What the ADMIN may do (S6.4): only send. Viewing, approving, requesting changes and declining are CLIENT decisions, recorded by
 * the server functions with the client's identity; the old browser-side admin buttons for them are gone.
 */
export function adminProposalActions(value: string | null | undefined): ProposalStatus[] {
  return value === 'draft' || value === 'changes_requested' ? ['sent'] : []
}

/** Stored status -> the one the product reasons about (legacy rejected = declined; legacy converted = approved). */
export function normalizeProposalStatus(value: unknown): ProposalStatus | 'unknown' {
  if (value === 'rejected') return 'declined'
  if (value === 'converted') return 'approved'
  return isProposalStatus(value) ? value : 'unknown'
}

/** The client may decide only on a delivered, undecided proposal. */
export function isClientDecidable(value: unknown): boolean {
  return value === 'sent' || value === 'viewed'
}

/** Draft edits are allowed only before the client can see the values, or while a requested revision is being made. */
export function isEditableProposalStatus(value: unknown): boolean {
  return value === 'draft' || value === 'changes_requested'
}

export function isProposalStatus(value: unknown): value is ProposalStatus {
  return typeof value === 'string' && (PROPOSAL_STATUSES as readonly string[]).includes(value)
}

/** Human label for a stored status. Unknown/legacy values render as-is rather
 *  than disappearing, so nothing is silently hidden from the admin. */
export function proposalStatusLabel(value: string | null | undefined): string {
  if (isProposalStatus(value)) return PROPOSAL_STATUS_LABELS[value]
  return value && value.trim() ? value : 'Unknown'
}

/** Badge classes for a stored status, with a neutral fallback so a legacy or
 *  unexpected value is still visibly a badge. */
export function proposalStatusStyle(value: string | null | undefined): string {
  if (isProposalStatus(value)) return PROPOSAL_STATUS_STYLES[value]
  return UNKNOWN_STATUS_STYLE
}

/** Allowed next statuses for a stored status; empty for terminal or unknown. */
export function proposalStatusTransitions(value: string | null | undefined): ProposalStatus[] {
  if (isProposalStatus(value)) return PROPOSAL_STATUS_TRANSITIONS[value]
  return []
}
