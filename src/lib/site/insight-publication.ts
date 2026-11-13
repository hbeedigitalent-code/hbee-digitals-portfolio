/**
 * Public-eligibility rules for Insights (blog_posts). Pure — no environment,
 * database or React — so the hub, article, related-article, SEO and sitemap
 * paths all apply exactly the same rule and tests can exercise it directly.
 *
 * A post is publicly eligible when status === 'published' AND published_at is
 * either empty or not later than now. There is no scheduler: a future-dated
 * row simply stays hidden until its date passes. Admin preview does not use
 * this rule.
 */

type PublicationRow = { status?: unknown; published_at?: unknown }

/** True when the row's publication date is empty, unparseable-as-future, or not later than `now`. */
export function isPublishedByDate(row: PublicationRow, now: Date = new Date()): boolean {
  const raw = row.published_at
  if (typeof raw !== 'string' || !raw.trim()) return true
  const time = Date.parse(raw)
  if (Number.isNaN(time)) return true
  return time <= now.getTime()
}

/** status === 'published' AND the publication date has arrived. */
export function isPubliclyEligible(row: PublicationRow, now: Date = new Date()): boolean {
  return row.status === 'published' && isPublishedByDate(row, now)
}

/**
 * Editorial feature window (code-side, deliberately tiny): a slug listed here may
 * lead the hub / homepage as a featured article only up to the end of the given
 * UTC day. After that it stays published, searchable and linkable — it just no
 * longer wins the featured position. The CMS row is never touched.
 */
export const FEATURE_UNTIL: Readonly<Record<string, string>> = {
  'november-2026-e-commerce-readiness': '2026-11-30',
}

/** True when the slug has no feature window, or its last featured day has not passed. */
export function isFeatureEligible(slug: string, now: Date = new Date()): boolean {
  const until = FEATURE_UNTIL[slug]
  if (!until) return true
  const endExclusive = Date.parse(`${until}T00:00:00Z`) + 24 * 60 * 60 * 1000
  return now.getTime() < endExclusive
}
