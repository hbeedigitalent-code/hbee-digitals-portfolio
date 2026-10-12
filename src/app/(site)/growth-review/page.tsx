import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { GrowthReviewAssessment, GrowthReviewContext, GrowthReviewHero } from '@/components/site/growth-review/GrowthReviewSections'

/**
 * Growth Review (/growth-review). Submits to the hardened POST
 * /api/growth-assessment — one submission API. Legacy /growth-readiness and
 * /assessment redirect here (next.config.js).
 */
export const metadata: Metadata = pageMetadata({
  title: 'Growth Review',
  description:
    'Tell us about your business and where growth feels stuck. We look at the whole picture — how customers find you, buy from you and come back — before recommending anything.',
  path: '/growth-review',
})

export default function GrowthReviewPage() {
  return (
    <>
      <GrowthReviewHero />
      <GrowthReviewContext />
      <GrowthReviewAssessment />
    </>
  )
}
