import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CaseStudiesCollection, CaseStudiesHero } from '@/components/site/work/CaseStudySections'
import { WorkCta } from '@/components/site/work/WorkSections'
import { portfolioCreativeEnabled } from '@/lib/portfolio-creative'
import { pageMetadata } from '@/lib/site/seo'
import { getCaseStudies } from '@/lib/site/work-data'

/**
 * Case Studies library (/case-studies). Part of the creative rollout: with
 * NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED off this route does not exist (404),
 * so production behaviour is unchanged. Lists only projects deliberately marked
 * as Case Studies; a database without that column simply lists none.
 */
export const revalidate = 300

export const metadata: Metadata = pageMetadata({
  title: 'Case Studies',
  description: 'Selected Hbee projects told in depth: the context, the work and how the pieces connect.',
  path: '/case-studies',
})

export default async function CaseStudiesPage() {
  if (!portfolioCreativeEnabled()) notFound()
  const items = await getCaseStudies()
  return (
    <>
      <CaseStudiesHero />
      <CaseStudiesCollection items={items} />
      <WorkCta />
    </>
  )
}
