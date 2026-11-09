'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { displayGrowthClassification } from '@/lib/growth-classification'
import {
  UUID_RE,
  businessName,
  filterReviews,
  needsReview,
  one,
  queueCounts,
  reviewClassification,
  reviewScore,
  reviewStatusLabel,
  sortReviews,
  storedDecisionMark,
  type QueueFilter,
  type QueueReview,
  type QueueSort,
} from '@/lib/admin/growth-review-queue'
import { AdminButton, AdminCallout, AdminEmptyState, AdminErrorState, AdminFilterGroup, AdminLoadingState, AdminPageHeader, AdminSearchField, AdminStatusBadge, AdminToolbar, adminBtn, type AdminTone } from '@/components/admin/ui/AdminUi'

/**
 * The Growth Review queue (Phase A2). Every submitted assessment has exactly one review, so this one view is
 * the list of both; /admin/growth-assessments forwards here. Data and authorization are unchanged: the same
 * admin-gated /api/admin/growth-reviews route, read once; filtering and sorting are client-side.
 */

const STATUS_TONE: Record<string, AdminTone> = { pending: 'amber', in_progress: 'blue', completed: 'green' }

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GrowthReviewQueue() {
  const [reviews, setReviews] = useState<QueueReview[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [sort, setSort] = useState<QueueSort>('newest')
  const [query, setQuery] = useState('')
  const [merchantId, setMerchantId] = useState<string | null>(null)

  // /admin/growth-reviews?merchant=<merchants.id> narrows the queue to one merchant (linked from the merchant page).
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('merchant')
    if (value && UUID_RE.test(value)) setMerchantId(value)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // /api/admin/growth-reviews verifies session, user-bound admin 2FA and active admin membership.
      const response = await fetch('/api/admin/growth-reviews?status=all', { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.reviews)) {
        // A denied or failed read is an error, never an empty queue.
        setLoadError(payload?.error || 'Could not load the queue. Please refresh and try again.')
        setReviews([])
        return
      }
      setLoadError(null)
      setReviews(payload.reviews)
    } catch {
      setLoadError('Could not load the queue. Please refresh and try again.')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const title = 'Growth Reviews'
  const description = 'Every assessment submitted through the public Growth Review form. Review it, prepare its Growth Profile, then record the programme decision.'

  const scoped = merchantId ? reviews.filter((r) => r.merchant_id === merchantId) : reviews
  const counts = queueCounts(scoped)
  const visible = sortReviews(filterReviews(reviews, { filter, query, merchantId }), sort)
  const merchantLabel = merchantId ? one(reviews.find((r) => r.merchant_id === merchantId)?.merchant)?.business_name || 'this merchant' : null

  const filters = [
    { key: 'all' as const, label: 'All', count: counts.all },
    { key: 'needs-review' as const, label: 'Needs review', count: counts['needs-review'] },
    { key: 'pending' as const, label: 'Pending', count: counts.pending },
    { key: 'in_progress' as const, label: 'In progress', count: counts.in_progress },
    { key: 'completed' as const, label: 'Completed', count: counts.completed },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Growth" title={title} description={description}>
        <AdminButton variant="secondary" href="/admin/growth-profiles">Growth Profiles</AdminButton>
      </AdminPageHeader>

      {loading ? (
        <AdminLoadingState label="Loading the queue…" />
      ) : loadError ? (
        <AdminErrorState title="Could not load the queue" message={loadError} onRetry={load} />
      ) : (
        <>
          {counts['needs-review'] > 0 ? (
            <AdminCallout tone="attention" title={`${counts['needs-review']} ${counts['needs-review'] === 1 ? 'review needs' : 'reviews need'} a human review`}>
              These assessments have been submitted but no review has been completed yet.{' '}
              <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setFilter('needs-review')}>Show them</button>
            </AdminCallout>
          ) : counts.all > 0 ? (
            <AdminCallout tone="good" title="Nothing is waiting for a review">Every submitted assessment has a completed review.</AdminCallout>
          ) : null}

          {merchantLabel && (
            <AdminCallout tone="info" title={`Showing reviews for ${merchantLabel}`}>
              <Link href="/admin/growth-reviews" onClick={() => setMerchantId(null)} className="font-semibold underline underline-offset-4">Show everyone</Link>
            </AdminCallout>
          )}

          <AdminToolbar>
            <AdminSearchField label="Search the queue" value={query} onChange={setQuery} placeholder="Search business, contact, email, industry or country" />
            <AdminFilterGroup label="Filter by review status" options={filters} value={filter} onChange={setFilter} />
            <button type="button" className={adminBtn('ghost', 'sm')} onClick={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}>
              {sort === 'newest' ? 'Newest first' : 'Oldest first'}
            </button>
          </AdminToolbar>

          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
              <AdminEmptyState title="No assessments yet" description="When someone completes the public Growth Review form, their submission appears here." />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)]">
              <AdminEmptyState title="Nothing matches" description="Try a different search or filter." action={<AdminButton variant="secondary" onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</AdminButton>} />
            </div>
          ) : (
            <ul aria-label="Growth reviews" className="space-y-3">
              {visible.map((review) => {
                const merchant = one(review.merchant)
                const score = reviewScore(review)
                const classification = reviewClassification(review)
                const mark = storedDecisionMark(review)
                const attention = needsReview(review.status)
                const submitted = formatDate(one(review.assessment)?.created_at || review.created_at)
                return (
                  <li key={review.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 sm:p-5" style={attention ? { borderLeft: '4px solid var(--ad-signal)' } : undefined}>
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                      <div className="min-w-0 flex-1 basis-64">
                        <Link href={`/admin/growth-reviews/${review.id}`} className="text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent)]">{businessName(review)}</Link>
                        <p className="mt-0.5 break-words text-sm text-[var(--text-secondary)]">{[merchant?.contact_name, merchant?.email].filter(Boolean).join(' · ') || 'No contact details stored'}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {[submitted && `Submitted ${submitted}`, merchant?.industry, merchant?.country].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <Link href={`/admin/growth-reviews/${review.id}`} className={adminBtn(attention ? 'primary' : 'secondary', 'sm')}>
                        {attention ? 'Open review' : 'Open'}
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <AdminStatusBadge tone={STATUS_TONE[review.status] || 'neutral'} dot>{reviewStatusLabel(review.status)}</AdminStatusBadge>
                      {score !== null && <AdminStatusBadge tone="dark">HGRI {score}</AdminStatusBadge>}
                      {classification && <AdminStatusBadge>{displayGrowthClassification(classification)}</AdminStatusBadge>}
                      {review.completed_at && <AdminStatusBadge tone="green">Reviewed {formatDate(review.completed_at)}</AdminStatusBadge>}
                      {mark === 'approved' && <AdminStatusBadge tone="blue">Marked approved</AdminStatusBadge>}
                      {mark === 'rejected' && <AdminStatusBadge tone="red">Marked not approved</AdminStatusBadge>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs text-[var(--text-muted)]">
            &ldquo;Marked approved&rdquo; is the status stored on the assessment. Open the review to see whether a recorded programme decision backs it.
          </p>
        </>
      )}
    </div>
  )
}
