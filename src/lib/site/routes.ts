/**
 * Public route helpers for the site. Final routes:
 *   /work, /work/[slug], /insights, /insights/[slug], /growth-review, /contact
 */

export const GROWTH_REVIEW_HREF = '/growth-review'
export const CONTACT_HREF = '/contact'

export const ALL_WORK_HREF = '/work'
export const ALL_INSIGHTS_HREF = '/insights'

export function caseStudyHref(slug: string) {
  return `/work/${slug}`
}

export function insightHref(slug: string) {
  return `/insights/${slug}`
}

export function growthReviewHref(constraint?: string) {
  return constraint ? `${GROWTH_REVIEW_HREF}?constraint=${encodeURIComponent(constraint)}` : GROWTH_REVIEW_HREF
}
