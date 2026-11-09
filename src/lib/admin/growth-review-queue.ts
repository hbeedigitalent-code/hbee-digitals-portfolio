/**
 * Growth Review queue logic (Phase A2). Pure: no React, no network.
 *
 * Only statuses the backend actually has are used. growth_reviews.status is one of 'pending' | 'in_progress'
 * | 'completed' (see ALLOWED_STATUS_FILTERS in /api/admin/growth-reviews). "Needs review" is derived from
 * that and nothing else. growth_assessments.review_status is a STORED mark: 'approved' / 'rejected' are
 * mirrored from a deliberate decision, but historical rows can carry 'approved' with no decision record,
 * so the queue shows it as a mark, never as proof of a decision (the decision panel shows provenance).
 */

export interface QueueMerchant {
  id?: string | null
  business_name?: string | null
  contact_name?: string | null
  email?: string | null
  website?: string | null
  industry?: string | null
  country?: string | null
}

export interface QueueAssessment {
  id?: string | null
  hgri_score?: number | null
  classification?: string | null
  growth_classification?: string | null
  review_status?: string | null
  created_at?: string | null
}

export interface QueueReview {
  id: string
  status: string
  created_at: string
  updated_at?: string | null
  completed_at?: string | null
  hgri_score?: number | null
  growth_classification?: string | null
  merchant_id?: string | null
  assessment_id?: string | null
  merchant?: QueueMerchant | null
  assessment?: QueueAssessment | null
}

export type QueueFilter = 'all' | 'needs-review' | 'pending' | 'in_progress' | 'completed'
export type QueueSort = 'newest' | 'oldest'

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
}

/** A review that a human still has to work on. */
export function needsReview(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress'
}

export function reviewStatusLabel(status: string | null | undefined): string {
  return (status && REVIEW_STATUS_LABEL[status]) || (status ? status.replace(/_/g, ' ') : 'Unknown')
}

/** A PostgREST embed can come back as an object or a one-element array. */
export function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function businessName(review: QueueReview): string {
  return (one(review.merchant)?.business_name || '').trim() || 'Unnamed business'
}

/** HGRI from the review (the human-adjusted value) or, failing that, the assessment's computed one. */
export function reviewScore(review: QueueReview): number | null {
  const own = review.hgri_score
  if (typeof own === 'number' && own > 0) return own
  const computed = one(review.assessment)?.hgri_score
  return typeof computed === 'number' && computed > 0 ? computed : null
}

export function reviewClassification(review: QueueReview): string | null {
  return review.growth_classification || one(review.assessment)?.growth_classification || one(review.assessment)?.classification || null
}

/** The stored mark on the assessment, only when it is one we can name. */
export function storedDecisionMark(review: QueueReview): 'approved' | 'rejected' | null {
  const value = one(review.assessment)?.review_status
  return value === 'approved' || value === 'rejected' ? value : null
}

export function queueCounts(reviews: QueueReview[]): Record<QueueFilter, number> {
  return {
    all: reviews.length,
    'needs-review': reviews.filter((r) => needsReview(r.status)).length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    in_progress: reviews.filter((r) => r.status === 'in_progress').length,
    completed: reviews.filter((r) => r.status === 'completed').length,
  }
}

export function filterReviews(reviews: QueueReview[], opts: { filter: QueueFilter; query: string; merchantId?: string | null }): QueueReview[] {
  const q = opts.query.trim().toLowerCase()
  return reviews.filter((review) => {
    if (opts.merchantId && review.merchant_id !== opts.merchantId) return false
    if (opts.filter === 'needs-review' && !needsReview(review.status)) return false
    if ((opts.filter === 'pending' || opts.filter === 'in_progress' || opts.filter === 'completed') && review.status !== opts.filter) return false
    if (!q) return true
    const merchant = one(review.merchant)
    return [merchant?.business_name, merchant?.contact_name, merchant?.email, merchant?.industry, merchant?.country].some((field) => (field || '').toLowerCase().includes(q))
  })
}

export function sortReviews(reviews: QueueReview[], sort: QueueSort): QueueReview[] {
  const dir = sort === 'oldest' ? 1 : -1
  return [...reviews].sort((a, b) => (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir)
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
