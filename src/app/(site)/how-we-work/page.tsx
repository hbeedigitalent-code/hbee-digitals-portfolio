import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import {
  ClientPortalSection,
  GrowthConditions,
  GrowthProcess,
  HowWeWorkCta,
  HowWeWorkHero,
  ProcessCapabilities,
  WorkingTogether,
} from '@/components/site/how-we-work/HowWeWorkSections'

/**
 * How We Work (/how-we-work). Fully static: no data reads. The Client Portal
 * is linked through its existing login route.
 */
export const metadata: Metadata = pageMetadata({
  title: 'How We Work',
  description:
    'We look at your business, customers, constraints and opportunities first — then determine what should move next. The right strategy, capabilities and work follow from there.',
  path: '/how-we-work',
})

export default function HowWeWorkPage() {
  return (
    <>
      <HowWeWorkHero />
      <GrowthConditions />
      <GrowthProcess />
      <ProcessCapabilities />
      <WorkingTogether />
      <ClientPortalSection />
      <HowWeWorkCta />
    </>
  )
}
