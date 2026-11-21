import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'
import { pageJsonLd } from '@/lib/site/page-schema'

import {
  GrowthReviewAssessment,
  GrowthReviewBfcm,
  GrowthReviewFinalCta,
  GrowthReviewHero,
  GrowthReviewHow,
  GrowthReviewLook,
  GrowthReviewQuestions,
  GrowthReviewReceive,
} from '@/components/site/growth-review/GrowthReviewSections'

/**
 * Free Shopify Growth Review (/growth-review). The campaign entry is the short
 * hero form (store URL, email, biggest challenge) → POST /api/growth-review-request,
 * which captures a LEAD. The deeper, scored Growth Profile assessment stays lower
 * on the page and still submits to the hardened POST /api/growth-assessment,
 * unchanged. Legacy /growth-readiness and /assessment redirect here (next.config.js).
 *
 * Statically rendered: the homepage's ?constraint= continuity and the campaign's
 * utm_* parameters are read in the browser (useSearchParams inside Suspense /
 * window.location). Page-level JSON-LD is WebPage + BreadcrumbList only (no
 * FAQPage, Service, prices, ratings or reviews).
 */
const TITLE = 'Free Shopify Growth Review: Find What to Fix First'
const DESCRIPTION =
  'Within 24 hours, we’ll review your Shopify store and send you the top 3 things we’d fix first. Free. No account needed. No obligation.'

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/growth-review',
})

export default function GrowthReviewPage() {
  const jsonLd = pageJsonLd({
    path: '/growth-review',
    name: 'Free Shopify Growth Review: Find What to Fix First',
    description: DESCRIPTION,
    breadcrumb: 'Growth Review',
  })
  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: block }} />
      ))}
      <GrowthReviewHero />
      <GrowthReviewReceive />
      <GrowthReviewLook />
      <GrowthReviewHow />
      <GrowthReviewBfcm />
      <GrowthReviewFinalCta />
      <GrowthReviewQuestions />
      <GrowthReviewAssessment />
    </>
  )
}
