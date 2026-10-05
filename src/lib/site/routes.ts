/**
 * Content URLs used by the rebuilt public site.
 *
 * Navigation already points at the owner-approved FUTURE routes (/work,
 * /insights, /growth-review). Links to individual pieces of real content
 * instead use the routes that work TODAY (/portfolio/[slug], /blog/[slug]),
 * so the isolated preview can be reviewed end to end. At launch, when the
 * redirects land, flip these helpers — nothing else needs to change.
 */

export const GROWTH_REVIEW_HREF = '/growth-review'
export const CONTACT_HREF = '/contact'

export const ALL_WORK_HREF = '/portfolio' // → /work at launch
export const ALL_INSIGHTS_HREF = '/blog' // → /insights at launch

export function caseStudyHref(slug: string) {
  return `/portfolio/${slug}` // → /work/[slug] at launch
}

export function insightHref(slug: string) {
  return `/blog/${slug}` // → /insights/[slug] at launch
}

export function growthReviewHref(constraint?: string) {
  return constraint ? `${GROWTH_REVIEW_HREF}?constraint=${encodeURIComponent(constraint)}` : GROWTH_REVIEW_HREF
}
