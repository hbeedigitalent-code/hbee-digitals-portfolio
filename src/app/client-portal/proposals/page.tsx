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
import { proposalStatusLabel } from '@/lib/proposal-status'
import {
  FILTERS,
  displayStatus,
  formatDate,
  formatMoney,
  isPastDate,
  matchesFilter,
  needsReview,
  statusTone,
  type ProposalFilter,
  type ProposalPricing,
} from '@/lib/client-portal/proposal-display'
import styles from './proposals.module.css'

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
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    )
  }

  const shown = proposals.filter((p) => matchesFilter(p, filter))

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" className={styles.node} />
          Proposals
        </p>
        <h1 className={styles.h1}>Your proposals</h1>
        <p className={styles.lead}>
          What Hbee is proposing, what it includes and what it costs. Review each one, then approve it or ask for changes.
        </p>
      </header>

      {error ? (
        <div className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}>
            <p>{error}</p>
            <button type="button" onClick={fetchProposals} className={styles.primary}>
              Try Again
            </button>
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <div className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}>
            <h2>No proposals yet</h2>
            <p>When Hbee Digitals sends you a proposal, it will appear here for review.</p>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.filters} role="group" aria-label="Filter proposals">
            {FILTERS.map((f) => {
              const count = proposals.filter((p) => matchesFilter(p, f.key)).length
              // "Expired" is derived from real expiry dates; it is only offered when something is expired.
              if (f.key === 'expired' && count === 0) return null
              return (
                <button
                  key={f.key}
                  type="button"
                  className={styles.filter}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className={styles.filterCount}>{count}</span>
                </button>
              )
            })}
          </div>

          {shown.length === 0 ? (
            <p className={styles.quiet}>No proposals in this view.</p>
          ) : (
            <ul className={styles.list}>
              {shown.map((proposal) => {
                const shownStatus = displayStatus(proposal)
                const tone = statusTone(shownStatus)
                const total = formatMoney(proposal.pricing?.total, proposal.pricing?.currency)
                const sent = formatDate(proposal.sent_at || proposal.created_at)
                const expiry = formatDate(proposal.expires_at)
                const past = isPastDate(proposal.expires_at)
                const showExpiry = needsReview(proposal.status) && !!expiry
                return (
                  <li key={proposal.id}>
                    <Link href={`/client-portal/proposals/${proposal.id}`} className={styles.row}>
                      <div>
                        <p className={styles.rowTitle}>{proposal.title || 'Untitled proposal'}</p>
                        <p className={styles.rowMeta}>
                          {[proposal.proposal_number, proposal.merchant?.business_name].filter(Boolean).join(' · ') || 'Proposal'}
                        </p>
                      </div>
                      <dl className={styles.facts}>
                        <div>
                          <dt>Investment</dt>
                          <dd>{total ?? 'Not specified'}</dd>
                        </div>
                        {sent && (
                          <div>
                            <dt>{proposal.sent_at ? 'Sent' : 'Created'}</dt>
                            <dd>{sent}</dd>
                          </div>
                        )}
                        {showExpiry && (
                          <div>
                            <dt>Valid until</dt>
                            <dd className={past ? styles.past : undefined}>
                              {expiry}
                              {past && ' (date has passed)'}
                            </dd>
                          </div>
                        )}
                      </dl>
                      <div className={styles.rowEnd}>
                        <span
                          className={`${styles.chip} ${tone === 'approved' ? styles.chipApproved : tone === 'changes' ? styles.chipChanges : tone === 'expired' ? styles.chipExpired : ''}`}
                        >
                          {shownStatus === 'expired' ? 'Expired' : proposalStatusLabel(proposal.status)}
                        </span>
                        <ArrowRight aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
