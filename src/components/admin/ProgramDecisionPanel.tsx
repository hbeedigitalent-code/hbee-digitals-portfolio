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
import SvgIcon from '@/components/ui/SvgIcon'

/** Exactly the values growth_program_decisions.decision permits. */
const DECISIONS = [
  {
    value: 'approved',
    label: 'Approve for the programme',
    tone: 'success',
    confirm:
      'Approve this merchant for the Growth Support Initiative?\n\nThis records a deliberate decision against your account and queues the outcome email.',
  },
  {
    value: 'declined',
    label: 'Do not approve',
    tone: 'error',
    confirm:
      'Record that this application is not being approved?\n\nThis queues a single, factual outcome email to the merchant.',
  },
  {
    value: 'withdrawn',
    label: 'Withdraw a previous approval',
    tone: 'warning',
    confirm:
      'Withdraw this merchant’s approval?\n\nThis revokes access to the released profile. No email is sent automatically — tell them yourself, in your own words.',
  },
] as const

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

      setNotice(
        result.released
          ? 'Decision recorded. The Growth Profile is now released to the client, and the outcome email has been queued.'
          : result.outcomeEmail?.queued
            ? 'Decision recorded. The outcome email has been queued. The profile is NOT released yet.'
            : 'Decision recorded. No outcome email was queued for this decision.',
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
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-[var(--bg-section)]" />
      </div>
    )
  }

  const linkage = state?.linkage
  const current = state?.current
  const clientState = linkage?.client_link_state

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Programme decision</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Completing a review prepares the Growth Profile. It does <strong>not</strong> approve
          this merchant. Approval is the separate, deliberate decision below.
        </p>
      </div>

      {/* ---- Current decision ------------------------------------------- */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Current state
        </p>
        <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
          {current
            ? `${current.decision} — recorded ${new Date(current.decided_at).toLocaleDateString()}`
            : state?.provenance === 'unverified_historical'
              ? 'Marked approved historically, with no decision record behind it'
              : 'No programme decision recorded'}
        </p>
        {state?.provenance === 'unverified_historical' && (
          <p className="mt-2 text-xs text-[var(--warning)]">
            Who approved this, and when, is not established. Recording a decision here requires
            an explicit acknowledgement.
          </p>
        )}
      </div>

      {/* ---- Linkage ----------------------------------------------------- */}
      <div className="space-y-2 text-sm">
        <Row label="Merchant" ok={Boolean(linkage?.merchant_id)}
             value={linkage?.merchant_id ? 'Linked' : 'Not linked'} />
        <Row
          label="Portal account"
          ok={clientState === 'linked'}
          value={
            clientState === 'linked'
              ? linkage.linked_clients[0]?.full_name || linkage.linked_clients[0]?.email || 'Linked'
              : clientState === 'ambiguous'
                ? 'More than one client is linked to this merchant'
                : clientState === 'no_merchant'
                  ? 'No merchant to link to'
                  : 'No portal account linked'
          }
        />
        <Row
          label="Profile for this assessment"
          ok={Boolean(linkage?.profile)}
          value={linkage?.profile ? linkage.profile.title || 'Prepared' : 'Not prepared yet'}
        />
        <Row
          label="Release gate"
          ok={linkage?.releaseEnabled === true}
          value={linkage?.releaseEnabled ? 'Enabled' : 'Disabled (GROWTH_PROFILE_RELEASE_ENABLED)'}
        />
      </div>

      {clientState !== 'linked' && (
        <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-subtle)] p-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--warning)]">
            Approving cannot release the profile yet
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {clientState === 'ambiguous'
              ? 'More than one portal account is linked to this merchant. Resolve that first — nothing is merged automatically.'
              : clientState === 'no_merchant'
                ? 'This assessment is not linked to a merchant record, so there is nothing to link a client to.'
                : 'No portal account is linked to this merchant, so there is nobody to release the profile to. Choose the correct existing client below and link it deliberately.'}
          </p>

          {/* THE LINKING ACTION.
              Nothing is matched by email and nothing is chosen automatically:
              an admin picks one existing client from the list and confirms.
              The write goes through link_client_to_merchant() via the gated
              route — the browser never touches clients.merchant_id. */}
          {clientState === 'no_client' && (
            <div className="space-y-2">
              <label htmlFor="link-client" className="block text-xs font-medium text-[var(--text-muted)]">
                Link an existing portal account to this merchant
              </label>
              <select
                id="link-client"
                value={clientToLink}
                onChange={(e) => setClientToLink(e.target.value)}
                disabled={clientsLoading || busy !== null}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">
                  {clientsLoading ? 'Loading clients…' : 'Select the correct client…'}
                </option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.business_name, c.full_name, c.email].filter(Boolean).join(' — ') || c.id}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={linkClient}
                disabled={!clientToLink || busy !== null}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]"
              >
                {busy === 'link' ? 'Linking…' : 'Link this client'}
              </button>
              <p className="text-xs text-[var(--text-muted)]">
                This is a deliberate, audited action. It is refused if that client already belongs
                to a different merchant, and nothing is ever linked by matching email addresses.
              </p>
            </div>
          )}
        </div>
      )}

      {!linkage?.releaseEnabled && (
        <p className="text-xs text-[var(--text-muted)]">
          The release gate is off, so an approval will be recorded and the merchant will be told
          they are approved — but the profile stays withheld until the gate is enabled.
        </p>
      )}

      {/* ---- Notes -------------------------------------------------------- */}
      <div className="space-y-3">
        <div>
          <label htmlFor="decision-notes" className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
            Internal note (never emailed)
          </label>
          <textarea
            id="decision-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            placeholder="Recorded on the decision for the audit trail."
          />
        </div>

        <div className="rounded-lg border border-[var(--border)] p-3">
          <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={shareWithMerchant}
              onChange={(e) => setShareWithMerchant(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Include a short message to the merchant in the <strong>not approved</strong> email.
              Only what you type below is sent — the internal note above never is.
            </span>
          </label>
          {shareWithMerchant && (
            <textarea
              value={sharedMessage}
              onChange={(e) => setSharedMessage(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Written for the merchant to read."
            />
          )}
        </div>
      </div>

      {/* ---- Actions ------------------------------------------------------ */}
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => record(d.value, d.confirm)}
            disabled={busy !== null}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)] ${
              d.tone === 'success'
                ? 'bg-[var(--success)] text-white hover:opacity-90'
                : d.tone === 'error'
                  ? 'border border-[var(--error)] text-[var(--error)] hover:bg-[var(--error-subtle)]'
                  : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-section)]'
            }`}
          >
            {busy === d.value ? 'Recording…' : d.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-[var(--error)]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm font-semibold text-[var(--success)]">
          {notice}
        </p>
      )}
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span
        className={`flex items-center gap-1.5 text-right text-xs font-medium ${
          ok ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'
        }`}
      >
        <SvgIcon
          name={ok ? 'check' : 'warning'}
          size={12}
          color={ok ? 'var(--success)' : 'var(--text-muted)'}
        />
        {value}
      </span>
    </div>
  )
}
