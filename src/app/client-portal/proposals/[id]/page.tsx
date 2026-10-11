// src/app/client-portal/proposals/[id]/page.tsx
//
// Client proposal review. Phase P3; presentation refined in Phase 18.4.
//
// This page never touches Supabase: every read and every decision goes through
// the authenticated /api/client-portal/proposals/* routes, which resolve the
// caller's clients.id server-side and enforce the ownership + status predicate.
// Attachments are metadata only; downloads use the existing 60-second
// signed-URL route, so no storage path ever reaches the browser.
//
// It also never imports createNotification.ts — the admin notification is
// emitted by the approve / request-changes routes on the server.
//
// Phase 18.4 changed layout and hierarchy only. The fetch, viewed, download, approve and
// request-changes handlers below are unchanged, as are the endpoints they call. Only fields
// the API returns are shown; there is no invented scope narrative, outcomes or discussion.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Download, FileText } from 'lucide-react'
import { proposalStatusLabel } from '@/lib/proposal-status'
import { formatFileSize } from '@/lib/proposal-file-validation'
import {
  displayStatus,
  formatDate,
  isProposalActionable,
  isProposalExpired,
  formatMoney,
  isPastDate,
  lifecycle,
  statusTone,
  type ProposalPricing,
} from '@/lib/client-portal/proposal-display'
import styles from '../proposals.module.css'

interface ProposalFile {
  id: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: string
}

interface ProposalService {
  name?: string
  description?: string
  price?: string | number
}

interface ClientProposal {
  id: string
  proposal_number: string | null
  title: string | null
  status: string
  services: ProposalService[] | null
  pricing: ProposalPricing | null
  timeline: string | null
  terms: string | null
  expires_at: string | null
  sent_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string | null
  merchant?: {
    business_name: string | null
    contact_name: string | null
    email: string | null
    website: string | null
  } | null
}

const MAX_REASON_LENGTH = 2000

function fileExtensionLabel(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === fileName.length - 1) return 'FILE'
  return fileName.slice(lastDot + 1).toUpperCase()
}

export default function ClientProposalDetailPage({ params }: { params: { id: string } }) {
  const [proposal, setProposal] = useState<ClientProposal | null>(null)
  const [files, setFiles] = useState<ProposalFile[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [busyFileId, setBusyFileId] = useState<string | null>(null)

  const [changesOpen, setChangesOpen] = useState(false)
  const [reason, setReason] = useState('')

  const fetchProposal = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/client-portal/proposals/${params.id}`, {
        credentials: 'same-origin',
      })

      if (response.status === 404) {
        setNotFound(true)
        return
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.proposal) {
        setError('Could not load this proposal. Please refresh and try again.')
        return
      }

      setProposal(payload.proposal as ClientProposal)
      setFiles(Array.isArray(payload.files) ? (payload.files as ProposalFile[]) : [])
    } catch (err) {
      console.error('Error:', err)
      setError('Could not load this proposal. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchProposal()
  }, [fetchProposal])

  // Mark as viewed once, after the proposal loads in `sent`. The route only
  // permits sent -> viewed, so this is a no-op in every other state.
  useEffect(() => {
    if (proposal?.status !== 'sent') return
    let cancelled = false

    async function markViewed() {
      try {
        const response = await fetch(`/api/client-portal/proposals/${params.id}/viewed`, {
          method: 'POST',
          credentials: 'same-origin',
        })
        if (!response.ok || cancelled) return
        setProposal((current) => (current ? { ...current, status: 'viewed' } : current))
      } catch {
        /* non-critical — the proposal is still readable */
      }
    }

    markViewed()
    return () => {
      cancelled = true
    }
  }, [proposal?.status, params.id])

  async function handleDownload(file: ProposalFile) {
    setError(null)
    setBusyFileId(file.id)
    try {
      const response = await fetch(
        `/api/client-portal/proposals/${params.id}/files/${file.id}/signed-url`,
        { credentials: 'same-origin' },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.url) {
        setError('Could not generate a download link.')
        return
      }

      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Error:', err)
      setError('Could not generate a download link.')
    } finally {
      setBusyFileId(null)
    }
  }

  async function handleApprove() {
    if (!confirm('Approve this proposal? Your account manager will be notified.')) return

    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch(`/api/client-portal/proposals/${params.id}/approve`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.proposal) {
        setError(payload?.error || 'Could not approve this proposal. Please try again.')
        return
      }

      setProposal((current) =>
        current
          ? { ...current, status: 'approved', accepted_at: payload.proposal.accepted_at }
          : current,
      )
      setSuccessMessage('Proposal approved. Your account manager has been notified.')
    } catch (err) {
      console.error('Error:', err)
      setError('Could not approve this proposal. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestChanges(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = reason.trim()
    if (!trimmed) {
      setError('Please describe the changes you would like.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/client-portal/proposals/${params.id}/request-changes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ reason: trimmed }),
        },
      )
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.proposal) {
        setError(payload?.error || 'Could not submit your request. Please try again.')
        return
      }

      setProposal((current) => (current ? { ...current, status: 'changes_requested' } : current))
      setChangesOpen(false)
      setReason('')
      setSuccessMessage('Your change request has been sent. We will be in touch shortly.')
    } catch (err) {
      console.error('Error:', err)
      setError('Could not submit your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (notFound || !proposal) {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <h2>Proposal not found</h2>
          <p>This proposal doesn&apos;t exist or is no longer available to you.</p>
          <Link href="/client-portal/proposals" className={styles.secondary}>
            Back to proposals
          </Link>
        </div>
      </div>
    )
  }

  const services = Array.isArray(proposal.services) ? proposal.services : []
  // One shared rule (also enforced by the approve / request-changes routes): sent or viewed AND not expired.
  const canDecide = isProposalActionable(proposal)
  const isExpired = isProposalExpired(proposal)
  const isApproved = proposal.status === 'approved'
  const isChangesRequested = proposal.status === 'changes_requested'

  const currency = proposal.pricing?.currency
  const total = formatMoney(proposal.pricing?.total, currency)
  const expiry = formatDate(proposal.expires_at)
  const expiryPast = isPastDate(proposal.expires_at)
  const shownStatus = displayStatus(proposal)
  const tone = statusTone(shownStatus)
  const steps = lifecycle(proposal)

  return (
    <div className={styles.page}>
      <Link href="/client-portal/proposals" className={styles.back}>
        <ArrowLeft aria-hidden="true" />
        All proposals
      </Link>

      {/* Header + commercial summary */}
      <header className={styles.panel}>
        <div className={styles.headTop}>
          <div style={{ minWidth: 0 }}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.node} />
              Proposal
            </p>
            <h1 className={styles.h1}>{proposal.title || 'Proposal'}</h1>
            <p className={styles.meta}>
              {[proposal.proposal_number, proposal.merchant?.business_name].filter(Boolean).join(' · ') || 'Proposal'}
            </p>
          </div>
          <span className={`${styles.chip} ${tone === 'approved' ? styles.chipApproved : tone === 'changes' ? styles.chipChanges : tone === 'expired' ? styles.chipExpired : ''}`}>
            {isExpired ? 'Expired' : proposalStatusLabel(proposal.status)}
          </span>
        </div>

        <dl className={styles.summary}>
          <div>
            <dt>Investment</dt>
            <dd className={total ? styles.big : undefined}>{total ?? 'Not specified'}</dd>
          </div>
          <div>
            <dt>Timeline</dt>
            <dd>{proposal.timeline || 'Not specified'}</dd>
          </div>
          <div>
            <dt>Payment terms</dt>
            <dd>{proposal.pricing?.payment_terms || 'Not specified'}</dd>
          </div>
          <div>
            <dt>Valid until</dt>
            <dd className={expiry && expiryPast ? styles.past : undefined}>
              {expiry ?? 'No expiry date'}
              {expiry && expiryPast && <small>This date has passed</small>}
            </dd>
          </div>
        </dl>

        <ol className={styles.life} aria-label="Proposal progress">
          {steps.map((s) => (
            <li key={s.name} className={`${styles.step} ${s.done ? styles.stepDone : styles.stepPending}`}>
              <span className={styles.stepName}>{s.name}</span>
              {s.date}
            </li>
          ))}
        </ol>

        {canDecide && (
          <a href="#proposal-decision" className={styles.jump}>
            Respond to this proposal ↓
          </a>
        )}
      </header>

      {successMessage && (
        <p role="status" className={styles.ok}>
          {successMessage}
        </p>
      )}

      {error && (
        <p role="alert" className={styles.err}>
          {error}
        </p>
      )}

      <div className={styles.layout}>
        <div className={styles.stack}>
          {/* Services / scope — exactly the services the proposal lists */}
          <section className={styles.panel} aria-labelledby="prop-scope">
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.node} />
              What is included
            </p>
            <h2 id="prop-scope" className={styles.h2}>
              Services &amp; scope
            </h2>
            {services.length === 0 ? (
              <p className={styles.quiet} style={{ marginTop: '0.75rem' }}>
                No services listed.
              </p>
            ) : (
              <>
                <ul className={styles.services}>
                  {services.map((service, index) => {
                    const price = formatMoney(service.price, currency)
                    return (
                      <li key={index} className={styles.service}>
                        <div style={{ minWidth: 0 }}>
                          <p className={styles.serviceName}>{service.name || '—'}</p>
                          {service.description && <p className={styles.serviceDesc}>{service.description}</p>}
                        </div>
                        {price && <p className={styles.servicePrice}>{price}</p>}
                      </li>
                    )
                  })}
                </ul>
                {total && (
                  <div className={styles.total}>
                    <span className={styles.totalLabel}>Total investment</span>
                    <span className={styles.totalValue}>{total}</span>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Documents — metadata only; downloads use the signed-URL route */}
          <section className={styles.panel} aria-labelledby="prop-docs">
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.node} />
              Files
            </p>
            <h2 id="prop-docs" className={styles.h2}>
              Documents
            </h2>
            {files.length === 0 ? (
              <p className={styles.quiet} style={{ marginTop: '0.75rem' }}>
                No documents attached to this proposal.
              </p>
            ) : (
              <ul className={styles.files}>
                {files.map((file) => (
                  <li key={file.id} className={styles.file}>
                    <div className={styles.fileMain}>
                      <FileText aria-hidden="true" />
                      <div style={{ minWidth: 0 }}>
                        <p className={styles.fileName} title={file.file_name}>
                          {file.file_name}
                        </p>
                        <p className={styles.fileMeta}>
                          {[fileExtensionLabel(file.file_name), formatFileSize(file.file_size), formatDate(file.uploaded_at)]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      disabled={busyFileId === file.id}
                      className={styles.dl}
                      aria-label={`Download ${file.file_name}`}
                    >
                      <Download aria-hidden="true" />
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Terms */}
          {proposal.terms && (
            <section className={styles.panel} aria-labelledby="prop-terms">
              <p className={styles.eyebrow}>
                <span aria-hidden="true" className={styles.node} />
                Terms
              </p>
              <h2 id="prop-terms" className={styles.h2}>
                Terms &amp; conditions
              </h2>
              <p className={styles.terms}>{proposal.terms}</p>
            </section>
          )}
        </div>

        {/* Decision */}
        <aside className={styles.aside}>
          <section id="proposal-decision" className={`${styles.panel} ${styles.decision}`} aria-labelledby="prop-decision">
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.node} />
              Next step
            </p>
            <h2 id="prop-decision" className={styles.h2}>
              Your decision
            </h2>

            {isApproved && (
              <p className={styles.decisionNote}>
                You approved this proposal{formatDate(proposal.accepted_at) ? ` on ${formatDate(proposal.accepted_at)}` : ''}. We&apos;ll be in touch
                with next steps.
              </p>
            )}

            {isExpired && (
              <>
                <p className={styles.decisionNote}>
                  This proposal&apos;s validity period has ended. Contact Hbee if you&apos;d like to revisit the scope.
                </p>
                <div className={styles.actions}>
                  <Link href="/contact" className={styles.secondary}>
                    Contact Hbee
                  </Link>
                </div>
              </>
            )}

            {isChangesRequested && (
              <p className={styles.decisionNote}>
                You&apos;ve requested changes to this proposal. We&apos;re reviewing your feedback and
                will send an updated version shortly.
              </p>
            )}

            {canDecide && !changesOpen && (
              <>
                <p className={styles.decisionNote}>
                  Review the scope and documents, then approve or tell us what you&apos;d like
                  changed.
                </p>
                <div className={styles.actions}>
                  <button type="button" onClick={handleApprove} disabled={submitting} className={styles.primary}>
                    <Check aria-hidden="true" />
                    {submitting ? 'Submitting…' : 'Approve Proposal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangesOpen(true)
                      setError(null)
                    }}
                    disabled={submitting}
                    className={styles.secondary}
                  >
                    Request Changes
                  </button>
                </div>
              </>
            )}

            {canDecide && changesOpen && (
              <form onSubmit={handleRequestChanges}>
                <div className={styles.field}>
                  <label htmlFor="proposal-change-reason" className={styles.label}>
                    What would you like changed? *
                  </label>
                  <textarea
                    id="proposal-change-reason"
                    rows={5}
                    maxLength={MAX_REASON_LENGTH}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Tell us what to adjust — scope, pricing, timeline, anything else."
                    className={styles.textarea}
                  />
                  <p className={styles.count}>
                    {reason.length}/{MAX_REASON_LENGTH}
                  </p>
                </div>
                <div className={styles.actions}>
                  <button type="submit" disabled={submitting || !reason.trim()} className={styles.primary}>
                    {submitting ? 'Sending…' : 'Send Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangesOpen(false)
                      setReason('')
                    }}
                    disabled={submitting}
                    className={styles.secondary}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
