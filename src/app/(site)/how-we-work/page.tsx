import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'
import { pageJsonLd } from '@/lib/site/page-schema'

import {
  ClientPortalSection,
  GrowthProcess,
  HowWeWorkCta,
  HowWeWorkHero,
  HowWeWorkQuestions,
  IsolatedFixes,
  ProcessCapabilities,
  WorkingTogether,
} from '@/components/site/how-we-work/HowWeWorkSections'

/**
 * How We Work (/how-we-work). Fully static: no data reads. The Client Portal
 * is linked through its existing login route. Page-level JSON-LD is WebPage +
 * BreadcrumbList only (no FAQPage; the questions are visible HTML).
 */
const TITLE = 'How Hbee Approaches Ecommerce Growth'
const DESCRIPTION =
  'Hbee diagnoses an ecommerce business before recommending a service: assess, prioritize, build, activate and optimize, with only the capabilities the diagnosis requires.'

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/how-we-work',
})

export default function HowWeWorkPage() {
  const jsonLd = pageJsonLd({
    path: '/how-we-work',
    name: 'How Hbee Digitals Approaches Ecommerce Growth',
    description: DESCRIPTION,
    breadcrumb: 'How We Work',
  })
  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: block }} />
      ))}
      <HowWeWorkHero />
      <IsolatedFixes />
      <GrowthProcess />
      <ProcessCapabilities />
      <WorkingTogether />
      <ClientPortalSection />
      <HowWeWorkQuestions />
      <HowWeWorkCta />
    </>
  )
}
