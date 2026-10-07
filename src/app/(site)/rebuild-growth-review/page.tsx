import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { GrowthReviewAssessment, GrowthReviewContext, GrowthReviewHero } from '@/components/site/growth-review/GrowthReviewSections'

/**
 * /rebuild-growth-review — the new public Growth Review, isolated for owner
 * review (Phase 16.4). Rebuild equivalent of the future /growth-review.
 *
 * Unlinked from production, not in the sitemap, noindex, 404 on any Vercel
 * production build. The live /growth-readiness, /assessment and
 * /assessment/thank-you routes are untouched. Submits to the existing hardened
 * POST /api/growth-assessment — no second submission API.
 */
export const metadata: Metadata = {
  title: 'Rebuild growth review',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function RebuildGrowthReviewPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  return (
    <>
      <GrowthReviewHero />
      <GrowthReviewContext />
      <GrowthReviewAssessment />
    </>
  )
}
