// src/app/client-portal/proposals/page.tsx
//
// Client proposal index.
//
// Like the detail page, this never touches Supabase: it reads only
// /api/client-portal/proposals, which resolves the caller's clients.id
// server-side and returns nothing but delivered proposals belonging to them.
// There are no writes of any kind on this page, and createNotification.ts is
// never imported.
//
// Phase 18.4 changed presentation only. Filters group the loaded rows by their real
// status (sent/viewed, approved, changes_requested); counts are counts of those rows.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import EmptyState from '@/components/client-portal/EmptyState'
import { PortalPageHeader } from '@/components/client-portal/PortalPageHeader'
import { PortalStatus } from '@/components/client-portal/PortalStatus'
import { toneForProposal } from '@/lib/client-portal/portal-status'
import { proposalStatusLabel } from '@/lib/proposal-status'
import {
  FILTERS,
  displayStatus,
  formatDate,
  formatMoney,
  isPastDate,
  matchesFilter,
  needsReview,
  type ProposalFilter,
  type ProposalPricing,
} from '@/lib/client-portal/proposal-display'
import prim from '@/components/client-portal/portal-primitives.module.css'
import styles from '@/components/client-portal/portal-screens.module.css'

interface ProposalListItem {
  id: string
  proposal_number: string | null
  title: string | null
  status: string
  pricing: ProposalPricing | null
  expires_at: string | null
  sent_at: string | null
  created_at: string
  merchant?: { business_name: string | null } | null
}

export default function ClientProposalsPage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ProposalFilter>('all')

  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/client-portal/proposals', {
        credentials: 'same-origin',
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.proposals)) {
        setError('Could not load your proposals. Please refresh and try again.')
        return
      }

      setProposals(payload.proposals as ProposalListItem[])
    } catch (err) {
      console.error('Error:', err)
      setError('Could not load your proposals. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProposals()
  }, [fetchProposals])

  if (loading) {
    return (
      <div className={styles.center} role="status" aria-label="Loading">
        <div className={styles.spinner} />
      </div>
    )
  }

  const shown = proposals.filter((p) => matchesFilter(p, filter))

  return (
    <div className={styles.page}>
      <PortalPageHeader
        eyebrow="Proposals"
        title="Your proposals"
        lead="What Hbee is proposing, what it includes and what it costs. Review each one, then approve it or ask for changes."
      />

      {error ? (
        <div className={styles.center}>
          <div className={styles.centerBody}>
            <p>{error}</p>
            <button type="button" onClick={fetchProposals} className={prim.secondary}>
              Try Again
            </button>
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <section className={styles.panel}>
          <EmptyState title="No proposals yet" description="When Hbee Digitals sends you a proposal, it will appear here for review." />
        </section>
      ) : (
        <>
          <div className={styles.filters} role="group" aria-label="Filter proposals">
            {FILTERS.map((f) => {
              const count = proposals.filter((p) => matchesFilter(p, f.key)).length
              // "Expired" is derived from real expiry dates; it is only offered when something is expired.
              if (f.key === 'expired' && count === 0) return null
              return (
                <button key={f.key} type="button" className={styles.filter} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}
                  <span className={styles.count}>{count}</span>
                </button>
              )
            })}
          </div>

          {shown.length === 0 ? (
            <p className={styles.quiet}>No proposals in this view.</p>
          ) : (
            <section className={styles.section} aria-label="Proposals">
              <ul className={styles.rows}>
                {shown.map((proposal) => {
                  const shownStatus = displayStatus(proposal)
                  const total = formatMoney(proposal.pricing?.total, proposal.pricing?.currency)
                  const sent = formatDate(proposal.sent_at || proposal.created_at)
                  const expiry = formatDate(proposal.expires_at)
                  const past = isPastDate(proposal.expires_at)
                  const showExpiry = needsReview(proposal.status) && !!expiry
                  const awaiting = needsReview(proposal.status) && shownStatus !== 'expired'
                  return (
                    <li key={proposal.id}>
                      <Link href={`/client-portal/proposals/${proposal.id}`} className={`${styles.row} ${styles.rowFig}`}>
                        <div className={styles.rowMain}>
                          <p className={styles.rowTitle}>{proposal.title || 'Untitled proposal'}</p>
                          <div className={styles.rowMeta}>
                            <span>{[proposal.proposal_number, proposal.merchant?.business_name].filter(Boolean).join(' · ') || 'Proposal'}</span>
                            {sent && <span>{proposal.sent_at ? 'Sent' : 'Created'} {sent}</span>}
                            {showExpiry && (
                              <span>
                                Valid until {expiry}
                                {past && ' (date has passed)'}
                              </span>
                            )}
                          </div>
                        </div>
                        <dl className={styles.ledger}>
                          <div className={styles.ledgerStrong}>
                            <dt>Investment</dt>
                            <dd>{total ?? 'Not specified'}</dd>
                          </div>
                        </dl>
                        <div className={styles.rowEnd}>
                          <PortalStatus tone={shownStatus === 'expired' ? 'neutral' : toneForProposal(proposal.status)}>
                            {shownStatus === 'expired' ? 'Expired' : proposalStatusLabel(proposal.status)}
                          </PortalStatus>
                          <span className={prim.link} aria-hidden="true">
                            {awaiting ? 'Review' : 'View'}
                            <ArrowRight />
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
