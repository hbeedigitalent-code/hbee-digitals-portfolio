import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'
import { pageJsonLd } from '@/lib/site/page-schema'

import {
  GrowthReviewAssessment,
  GrowthReviewCapabilities,
  GrowthReviewHero,
  GrowthReviewNext,
  GrowthReviewQuestions,
  GrowthReviewSymptoms,
} from '@/components/site/growth-review/GrowthReviewSections'

/**
 * Growth Review (/growth-review). Submits to the hardened POST
 * /api/growth-assessment — one submission API (unchanged by S2.2). Legacy
 * /growth-readiness and /assessment redirect here (next.config.js).
 *
 * Statically rendered: the homepage's ?constraint= continuity is read in the
 * browser by <ConstraintContext> (useSearchParams inside Suspense). Page-level
 * JSON-LD is WebPage + BreadcrumbList only (no FAQPage, Service, prices,
 * ratings or reviews).
 */
const TITLE = 'Ecommerce Growth Review for Shopify Brands'
const DESCRIPTION =
  'Find what to fix first in your ecommerce business. Tell Hbee where growth feels stuck; the team reviews your business and store and recommends the next step.'

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/growth-review',
})

export default function GrowthReviewPage() {
  const jsonLd = pageJsonLd({
    path: '/growth-review',
    name: 'Ecommerce Growth Review: Find What to Fix First',
    description: DESCRIPTION,
    breadcrumb: 'Growth Review',
  })
  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: block }} />
      ))}
      <GrowthReviewHero />
      <GrowthReviewSymptoms />
      <GrowthReviewCapabilities />
      <GrowthReviewNext />
      <GrowthReviewQuestions />
      <GrowthReviewAssessment />
    </>
  )
}
