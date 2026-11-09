// src/components/admin/ProgramDecisionPanel.tsx
//
// The deliberate program decision, as a surface an admin can actually use.
//
// WHY IT EXISTS. record_program_decision() and its endpoint have been in place
// for some time, but NOTHING in the browser ever called them: there was no way
// to approve or decline a merchant from the admin UI at all. Completing a
// review prepared a profile and stopped there.
//
// WHAT IT IS CAREFUL ABOUT:
//   * It states plainly that completing a review is not approving a merchant.
//   * It shows the real linkage state, and when no portal account is linked it
//     says so and explains that approving cannot release anything yet — rather
//     than letting an admin approve into a void.
//   * It offers only the three decisions the schema's CHECK constraint permits:
//     approved, declined, withdrawn. No enum is invented here.
//   * It never writes the decision itself. Every button posts to the gated
//     endpoint, which is the only writer.
//   * It distinguishes "decision recorded" from "profile released", because
//     while GROWTH_PROFILE_RELEASE_ENABLED is off those are different things.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminCallout, AdminLoadingState, AdminNotice, AdminSection, AdminStatusRow, AdminStatusRows, adminBtn } from '@/components/admin/ui/AdminUi'
import PortalInvitationBlock from '@/components/admin/PortalInvitationBlock'
import { invitationPanelMode } from '@/lib/portal-invitation-state'

/** Exactly the values growth_program_decisions.decision permits. */
const DECISIONS = [
  {
    value: 'approved',
    label: 'Approve for the programme',
    tone: 'success',
    effect: 'Records the approval and queues the approval email. With no portal account connected, it also creates the portal invitation. The profile is released only when an account is connected and the release gate is on.',
    confirm:
      'Approve this merchant for the Growth Support Initiative?\n\nThis records a deliberate decision against your account and queues the outcome email.',
  },
  {
    value: 'declined',
    label: 'Do not approve',
    tone: 'error',
    effect: 'Records that the application is not being approved and queues one factual outcome email (with your message only if you tick the box above).',
    confirm:
      'Record that this application is not being approved?\n\nThis queues a single, factual outcome email to the merchant.',
  },
  {
    value: 'withdrawn',
    label: 'Withdraw a previous approval',
    tone: 'warning',
    effect: 'Revokes access to a released profile. No email is sent automatically: tell the merchant yourself, in your own words.',
    confirm:
      'Withdraw this merchant’s approval?\n\nThis revokes access to the released profile. No email is sent automatically — tell them yourself, in your own words.',
  },
] as const

const DECISION_LABEL: Record<string, string> = { approved: 'Approved', declined: 'Not approved', withdrawn: 'Approval withdrawn' }

interface Props {
  assessmentId: string
  /** Called after a decision is recorded, so the host page can refresh. */
  onRecorded?: () => void
}

export default function ProgramDecisionPanel({ assessmentId, onRecorded }: Props) {
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [sharedMessage, setSharedMessage] = useState('')
  const [shareWithMerchant, setShareWithMerchant] = useState(false)
  const [candidates, setCandidates] = useState<any[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientToLink, setClientToLink] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/growth-assessments/${assessmentId}/decision`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not load the decision state.')
      setState(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the decision state.')
    } finally {
      setLoading(false)
    }
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [load])

  // The candidate list is only fetched when a link is actually needed, and it
  // is the SAME admin-gated list the project form uses. It is a convenience for
  // choosing, never an automatic match: the admin picks one.
  useEffect(() => {
    if (state?.linkage?.client_link_state !== 'no_client') return
    let cancelled = false
    setClientsLoading(true)
    fetch('/api/admin/clients?view=options', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.clients)) setCandidates(payload.clients)
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setClientsLoading(false) })
    return () => { cancelled = true }
  }, [state?.linkage?.client_link_state])

  /**
   * Links one chosen client to this merchant through the gated route, which
   * calls link_client_to_merchant(). That function locks the MERCHANT row
   * first, refuses a merchant already linked elsewhere, refuses to relink a
   * client without an explicit flag, and writes an audit row naming the acting
   * admin. Nothing here bypasses it.
   */
  async function linkClient() {
    const merchantId = state?.linkage?.merchant_id
    if (!clientToLink || !merchantId) return

    const chosen = candidates.find((c) => c.id === clientToLink)
    const label = [chosen?.business_name, chosen?.full_name, chosen?.email]
      .filter(Boolean)
      .join(' — ') || clientToLink

    if (!confirm(`Link ${label} to this merchant?\n\nThis is recorded against your account.`)) return

    setBusy('link')
    setError(null)
    setNotice(null)

    try {
      const response = await fetch('/api/admin/clients/link-merchant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ clientId: clientToLink, merchantId }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || result.error || 'The client could not be linked.')
      }

      setNotice('Client linked. You can now record a programme decision.')
      setClientToLink('')
      await load()
      onRecorded?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The client could not be linked.')
    } finally {
      setBusy(null)
    }
  }

  async function sendInvitation() {
    if (!confirm('Send a portal invitation to this merchant’s email address?')) return
    setBusy('invite')
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/growth-assessments/${assessmentId}/invite`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || result.error || 'The invitation could not be sent.')
      setNotice(
        result.state === 'already_linked'
          ? 'This merchant already has a connected portal account.'
          : result.state === 'existing'
            ? 'An invitation is already open for this merchant — it has been re-sent.'
            : 'Invitation sent. The account connects when the merchant accepts it.',
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The invitation could not be sent.')
    } finally {
      setBusy(null)
    }
  }

  async function record(decision: string, confirmText: string, acknowledge = false) {
    if (!acknowledge && !confirm(confirmText)) return

    setBusy(decision)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/admin/growth-assessments/${assessmentId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          decision,
          notes: notes.trim() || undefined,
          ...(decision === 'declined' && shareWithMerchant && sharedMessage.trim()
            ? { shareMessageWithMerchant: true, sharedMessage: sharedMessage.trim() }
            : {}),
          ...(acknowledge ? { acknowledgeUnverifiedHistory: true } : {}),
        }),
      })
      const result = await response.json().catch(() => ({}))

      // A stored 'approved' with no decision behind it needs an explicit
      // acknowledgement before a fresh decision can be recorded over it.
      if (response.status === 409 && result?.requiresAcknowledgement) {
        if (
          confirm(
            `${result.message}\n\nRecord your decision anyway, acknowledging that the stored status has no provenance?`,
          )
        ) {
          await record(decision, confirmText, true)
        }
        return
      }

      if (!response.ok) {
        throw new Error(result.message || result.error || 'The decision could not be recorded.')
      }

      const base = result.released
        ? 'Decision recorded. The Growth Profile is now released to the client, and the outcome email has been queued.'
        : result.outcomeEmail?.queued
          ? 'Decision recorded. The outcome email has been queued. The profile is NOT released yet.'
          : 'Decision recorded. No outcome email was queued for this decision.'
      // Phase 16.6: an approval with no connected account also sends the portal invitation.
      const inv = result.invitation
      if (inv && (!inv.ok || inv.emailQueued === false)) {
        setError(inv.message || 'The approval was recorded, but the portal invitation could not be sent.')
      }
      setNotice(
        inv?.ok && inv.emailQueued
          ? `${base} A portal invitation has been ${inv.state === 'existing' ? 're-sent' : 'sent'} — the profile becomes visible once the merchant connects their account.`
          : base,
      )
      setNotes('')
      setSharedMessage('')
      setShareWithMerchant(false)
      await load()
      onRecorded?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The decision could not be recorded.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <AdminSection id="decision-panel" title="Programme decision">
        <AdminLoadingState label="Loading the decision state…" />
      </AdminSection>
    )
  }

  const linkage = state?.linkage
  const current = state?.current
  const clientState = linkage?.client_link_state
  // The server's own record of the invitation (portal_invitations), not a browser guess.
  const invitation = state?.invitation
  const inviteMode = invitationPanelMode(clientState, invitation)
  const history: any[] = Array.isArray(state?.decisions) ? state.decisions : []
  const linkedClient = clientState === 'linked' ? linkage?.linked_clients?.[0] : null

  return (
    <AdminSection id="decision-panel" title="Programme decision" description="Completing a review prepares the Growth Profile. It does not approve this merchant. Approval is the separate, deliberate decision below, recorded against your account.">
      <div className="space-y-6">
        {/* ---- Current decision ------------------------------------------- */}
        <AdminCallout
          tone={current?.decision === 'approved' ? 'good' : current ? 'warn' : state?.provenance === 'unverified_historical' ? 'warn' : 'attention'}
          title={
            current
              ? `${DECISION_LABEL[current.decision] || current.decision} — recorded ${new Date(current.decided_at).toLocaleDateString()}`
              : state?.provenance === 'unverified_historical'
                ? 'Marked approved historically, with no decision record behind it'
                : 'No programme decision recorded'
          }
        >
          {state?.provenance === 'unverified_historical'
            ? 'Who approved this, and when, is not established. Recording a decision here requires an explicit acknowledgement.'
            : !current
              ? 'Nothing has been approved or declined for this assessment yet.'
              : null}
        </AdminCallout>

        {/* ---- Linkage: the real relationships ------------------------------ */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Connections</h3>
          <AdminStatusRows>
            <AdminStatusRow label="Merchant" ok={Boolean(linkage?.merchant_id)}>
              {linkage?.merchant_id ? <Link href={`/admin/merchants/${linkage.merchant_id}`}>View merchant</Link> : 'Not linked'}
            </AdminStatusRow>
            <AdminStatusRow label="Portal account" ok={clientState === 'linked'}>
              {linkedClient ? (
                <Link href={`/admin/client-portal/${linkedClient.id}`}>{linkedClient.full_name || linkedClient.email || 'View client'}</Link>
              ) : clientState === 'ambiguous' ? 'More than one client is linked to this merchant'
                : clientState === 'no_merchant' ? 'No merchant to link to'
                  : inviteMode === 'invitation_open' ? 'Invitation sent, waiting for the merchant to accept'
                    : 'No portal account linked'}
            </AdminStatusRow>
            <AdminStatusRow label="Growth Profile for this assessment" ok={Boolean(linkage?.profile)}>
              {linkage?.profile ? <Link href={`/admin/growth-profiles/${linkage.profile.id}`}>{linkage.profile.title || 'Open profile'}</Link> : 'Not prepared yet'}
            </AdminStatusRow>
            <AdminStatusRow label="Release gate" ok={linkage?.releaseEnabled === true}>
              {linkage?.releaseEnabled ? 'Enabled' : 'Disabled'}
            </AdminStatusRow>
          </AdminStatusRows>
        </div>

        {clientState !== 'linked' && (
          <div className="space-y-3 rounded-xl border border-[var(--ad-warning)]/40 bg-[var(--ad-warning-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {inviteMode === 'invitation_open' ? 'Waiting for the merchant to accept their invitation' : 'Approving cannot release the profile yet'}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              {clientState === 'ambiguous'
                ? 'More than one portal account is linked to this merchant. Resolve that first — nothing is merged automatically.'
                : clientState === 'no_merchant'
                  ? 'This assessment is not linked to a merchant record, so there is nothing to link a client to.'
                  : inviteMode === 'invitation_open'
                    ? 'A portal invitation is open. The profile is released to the merchant once they accept it and their account is connected.'
                    : 'No portal account is linked to this merchant, so there is nobody to release the profile to. Invite the merchant below, or choose the correct existing client and link it deliberately.'}
            </p>

            {/* Nothing is matched by email and nothing is chosen automatically: an admin picks one existing client
                and confirms. The write goes through link_client_to_merchant() via the gated route; the browser
                never touches clients.merchant_id. The usual path is the invitation: the link is made only when
                the merchant accepts while signed in with the invited, verified email. Re-sending reuses the
                open invitation. */}
            <PortalInvitationBlock clientState={clientState} invitation={invitation} busy={busy !== null} onSend={sendInvitation} />
            {clientState === 'no_client' && (
              <div className="space-y-2">
                <label htmlFor="link-client" className="block text-xs font-semibold text-[var(--text-muted)]">Link an existing portal account to this merchant</label>
                <select id="link-client" value={clientToLink} onChange={(e) => setClientToLink(e.target.value)} disabled={clientsLoading || busy !== null} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)]">
                  <option value="">{clientsLoading ? 'Loading clients…' : 'Select the correct client…'}</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>{[c.business_name, c.full_name, c.email].filter(Boolean).join(' — ') || c.id}</option>
                  ))}
                </select>
                <button type="button" onClick={linkClient} disabled={!clientToLink || busy !== null} className={adminBtn('secondary', 'sm')}>
                  {busy === 'link' ? 'Linking…' : 'Link this client'}
                </button>
                <p className="text-xs text-[var(--text-muted)]">A deliberate, audited action. It is refused if that client already belongs to a different merchant, and nothing is ever linked by matching email addresses.</p>
              </div>
            )}
          </div>
        )}

        {!linkage?.releaseEnabled && (
          <p className="text-sm text-[var(--text-muted)]">The release gate is off, so an approval will be recorded and the merchant will be told they are approved — but the profile stays withheld until the gate is enabled.</p>
        )}

        {/* ---- Notes -------------------------------------------------------- */}
        <div className="space-y-3">
          <div>
            <label htmlFor="decision-notes" className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">Internal note (never emailed)</label>
            <textarea id="decision-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)]" placeholder="Recorded on the decision for the audit trail." />
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3">
            <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={shareWithMerchant} onChange={(e) => setShareWithMerchant(e.target.checked)} className="mt-1" />
              <span>Include a short message to the merchant in the <strong>not approved</strong> email. Only what you type below is sent — the internal note above never is.</span>
            </label>
            {shareWithMerchant && (
              <textarea value={sharedMessage} onChange={(e) => setSharedMessage(e.target.value)} rows={2} aria-label="Message to the merchant" className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)]" placeholder="Written for the merchant to read." />
            )}
          </div>
        </div>

        {/* ---- Actions: each one says what it will do ------------------------- */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Record a decision</h3>
          <div className="grid gap-3">
            {DECISIONS.map((d) => (
              <div key={d.value} className="flex flex-col gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <p className="min-w-0 flex-1 text-sm text-[var(--text-secondary)]">{d.effect}</p>
                <button type="button" onClick={() => record(d.value, d.confirm)} disabled={busy !== null} className={`${adminBtn(d.tone === 'success' ? 'primary' : d.tone === 'error' ? 'danger' : 'secondary')} sm:shrink-0`}>
                  {busy === d.value ? 'Recording…' : d.label}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Every decision asks you to confirm first and is recorded against your account.</p>
        </div>

        {error && <AdminNotice tone="error">{error}</AdminNotice>}
        {notice && <AdminNotice tone="success">{notice}</AdminNotice>}

        {/* ---- History ------------------------------------------------------- */}
        {history.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Decision history</h3>
            <ul className="space-y-2">
              {history.slice(0, 6).map((h: any) => (
                <li key={h.id} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                  <span className="font-semibold text-[var(--text-primary)]">{DECISION_LABEL[h.decision] || h.decision}</span>
                  <span className="text-[var(--text-muted)]"> · {new Date(h.decided_at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  {h.acknowledged_unverified_history && <span className="text-[var(--ad-warning)]"> · acknowledged an unverified prior approval</span>}
                  {h.notes && <p className="mt-1 whitespace-pre-line break-words text-[var(--text-secondary)]">{h.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminSection>
  )
}
