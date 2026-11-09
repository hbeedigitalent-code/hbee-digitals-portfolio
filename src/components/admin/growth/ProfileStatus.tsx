import Link from 'next/link'
import { DECISION_LABEL, type ReleaseEvaluation } from '@/lib/admin/profile-release'
import { reviewStatusLabel } from '@/lib/admin/growth-review-queue'
import { AdminCallout, AdminStatusBadge, AdminStatusRow, AdminStatusRows } from '@/components/admin/ui/AdminUi'

/**
 * Growth Profile status (Phase 6). Presentational only. Every value shown here was DERIVED BY THE SERVER from a
 * stored record (see src/lib/admin/profile-release.ts); this file never infers a state. "Prepared", "Approved",
 * "Linked" and "Visible to client" are four different facts and are shown separately:
 *   prepared  = the profile exists and its review is (or is not) completed
 *   decision  = the merchant's latest recorded programme decision, and whether it names THIS profile
 *   linked    = a portal account is tied to the merchant (clients.merchant_id), and any invitation's lifecycle
 *   visible   = the Client Portal would serve it right now (all of the above + the release gate)
 */

export interface ProfileStatusData {
  review: { known: boolean; id: string | null; status: string | null; completed_at: string | null }
  decision: { known: boolean; current: { decision: string | null; decided_at?: string | null; profile_id?: string | null } | null; history: Array<{ decision: string | null; decided_at?: string | null; profile_id?: string | null; assessment_id?: string | null }> }
  linkage: { known: boolean; linked_clients: number; client_id: string | null }
  invitation: { known: boolean; summary: { state: 'none' | 'open' | 'consumed' | 'expired' | 'revoked'; expires_at: string | null; consumed_at: string | null } | null }
  release: ReleaseEvaluation
}

const day = (value?: string | null) => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const INVITATION_LABEL = { none: 'No invitation', open: 'Invitation open', consumed: 'Invitation accepted', expired: 'Invitation expired', revoked: 'Invitation revoked' } as const

export function reviewChip(status: ProfileStatusData) {
  const r = status.review
  if (!r.known) return { tone: 'neutral' as const, text: 'Review unknown' }
  if (!r.status) return { tone: 'neutral' as const, text: 'No review record' }
  if (r.status === 'completed') return { tone: 'green' as const, text: 'Review completed' }
  return { tone: 'amber' as const, text: `Review ${reviewStatusLabel(r.status).toLowerCase()}` }
}

export function decisionChip(status: ProfileStatusData) {
  const state = status.release.decisionState
  const when = day(status.decision.current?.decided_at)
  const suffix = when ? ` · ${when}` : ''
  switch (state) {
    case 'approved_this': return { tone: 'blue' as const, text: `Approved for this profile${suffix}` }
    case 'approved_other': return { tone: 'amber' as const, text: `Approved: another profile${suffix}` }
    case 'declined': return { tone: 'red' as const, text: `Not approved${suffix}` }
    case 'withdrawn': return { tone: 'amber' as const, text: `Approval withdrawn${suffix}` }
    case 'none': return { tone: 'neutral' as const, text: 'No decision recorded' }
    default: return { tone: 'neutral' as const, text: 'Decision unknown' }
  }
}

export function linkageChip(status: ProfileStatusData) {
  if (!status.linkage.known) return { tone: 'neutral' as const, text: 'Portal account unknown' }
  const n = status.linkage.linked_clients
  if (n === 0) return { tone: 'neutral' as const, text: 'No portal account' }
  if (n === 1) return { tone: 'blue' as const, text: 'Portal account linked' }
  return { tone: 'amber' as const, text: `${n} portal accounts linked` }
}

export function invitationChip(status: ProfileStatusData) {
  if (!status.invitation.known || !status.invitation.summary) return { tone: 'neutral' as const, text: 'Invitation unknown' }
  const state = status.invitation.summary.state
  const tone = state === 'open' ? ('blue' as const) : state === 'consumed' ? ('green' as const) : state === 'none' ? ('neutral' as const) : ('amber' as const)
  return { tone, text: INVITATION_LABEL[state] }
}

export function releaseChip(status: ProfileStatusData) {
  const v = status.release.visible
  if (v === true) return { tone: 'dark' as const, text: 'Visible to client' }
  if (v === false) return { tone: 'neutral' as const, text: 'Withheld from client' }
  return { tone: 'neutral' as const, text: 'Client visibility unknown' }
}

/** Compact row of the five facts, for lists. */
export function ProfileChips({ status }: { status: ProfileStatusData | undefined }) {
  if (!status) return <AdminStatusBadge>Status unavailable</AdminStatusBadge>
  const chips = [reviewChip(status), decisionChip(status), linkageChip(status), invitationChip(status), releaseChip(status)]
  return (
    <>
      {chips.map((chip) => (
        <AdminStatusBadge key={chip.text} tone={chip.tone}>{chip.text}</AdminStatusBadge>
      ))}
    </>
  )
}

/** The explained breakdown, for the detail page. */
export function ProfileStanding({ status, profileId, merchantId, releaseEnabled }: { status: ProfileStatusData | undefined; profileId: string; merchantId: string | null; releaseEnabled: boolean | null }) {
  if (!status) {
    return <AdminCallout tone="warn" title="Status could not be determined">The stored review, decision and linkage records could not be read. Refresh to try again.</AdminCallout>
  }
  const review = reviewChip(status)
  const decision = decisionChip(status)
  const linkage = linkageChip(status)
  const invitation = invitationChip(status)
  const visible = status.release.visible
  const reviewHref = status.review.id ? `/admin/growth-reviews/${status.review.id}` : null

  return (
    <div className="space-y-5">
      {visible === true ? (
        <AdminCallout tone="good" title="The Client Portal would show this profile right now">
          A programme approval names this profile, a portal account is linked, and the release gate is on.
        </AdminCallout>
      ) : visible === false ? (
        <AdminCallout tone="attention" title="This profile is not visible to the client">
          <ul className="list-disc space-y-1 pl-5">
            {status.release.blockers.map((b) => <li key={b.code}>{b.text}</li>)}
          </ul>
        </AdminCallout>
      ) : (
        <AdminCallout tone="warn" title="Client visibility could not be determined">Some of the records behind it could not be read. Nothing is assumed.</AdminCallout>
      )}

      <AdminStatusRows>
        <AdminStatusRow label="Preparation" ok={status.review.status === 'completed'}>
          {reviewHref ? <Link href={reviewHref}>{review.text}</Link> : review.text}
          {status.review.completed_at && <span className="font-normal text-[var(--text-muted)]"> · {day(status.review.completed_at)}</span>}
        </AdminStatusRow>
        <AdminStatusRow label="Programme decision" ok={status.release.decisionState === 'approved_this'}>
          {reviewHref ? <Link href={`${reviewHref}#decision`}>{decision.text}</Link> : decision.text}
        </AdminStatusRow>
        <AdminStatusRow label="Portal account" ok={status.linkage.known && status.linkage.linked_clients === 1}>
          {status.linkage.client_id ? <Link href={`/admin/client-portal/${status.linkage.client_id}`}>{linkage.text}</Link> : linkage.text}
        </AdminStatusRow>
        <AdminStatusRow label="Portal invitation" ok={status.invitation.summary?.state === 'consumed'}>{invitation.text}</AdminStatusRow>
        <AdminStatusRow label="Release gate" ok={releaseEnabled === true}>{releaseEnabled === null ? 'Unknown' : releaseEnabled ? 'On' : 'Off'}</AdminStatusRow>
        <AdminStatusRow label="Client visibility" ok={visible === true}>{releaseChip(status).text}</AdminStatusRow>
      </AdminStatusRows>

      {status.decision.history.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Decision history for this merchant</h3>
          <ul className="space-y-2">
            {status.decision.history.map((h, i) => (
              <li key={i} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <span className="font-semibold text-[var(--text-primary)]">{(h.decision && DECISION_LABEL[h.decision]) || h.decision}</span>
                <span className="text-[var(--text-muted)]"> · {day(h.decided_at) || 'date unknown'}</span>
                {h.profile_id && <span className="text-[var(--text-muted)]"> · {h.profile_id === profileId ? 'this profile' : 'another profile'}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {merchantId && <p className="text-xs text-[var(--text-muted)]">Decisions are recorded on the review, not here. The latest decision for the merchant decides what the portal shows.</p>}
    </div>
  )
}
