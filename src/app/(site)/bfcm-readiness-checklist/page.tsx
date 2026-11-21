import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'
import { pageJsonLd } from '@/lib/site/page-schema'

import { ChecklistFinalCta, ChecklistHero, ChecklistList } from '@/components/site/bfcm-checklist/ChecklistSections'

/**
 * Free 15-Point BFCM Readiness Checklist (/bfcm-readiness-checklist): the
 * destination promised by the BFCM campaign flyers. An interactive self-review
 * checklist (tick state stays in the browser), an email-gated PDF copy
 * (POST /api/bfcm-checklist-request → contact_submissions), and a hand-off to the
 * Free Growth Review. Statically rendered: campaign utm_* parameters are read in
 * the browser. Page-level JSON-LD is WebPage + BreadcrumbList only.
 */
// Rendered through the root '%s | Hbee Digitals' template, so no suffix or year is needed here.
const TITLE = '15-Point BFCM Readiness Checklist'
const DESCRIPTION =
  'Use Hbee Digitals’ free 15-point BFCM readiness checklist to review mobile experience, product clarity, shipping, checkout and conversion tracking before traffic increases.'

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/bfcm-readiness-checklist',
})

export default function BfcmReadinessChecklistPage() {
  const jsonLd = pageJsonLd({
    path: '/bfcm-readiness-checklist',
    name: 'Is Your Store Ready for Black Friday Traffic? Free 15-Point BFCM Readiness Checklist',
    description: DESCRIPTION,
    breadcrumb: 'BFCM Readiness Checklist',
  })
  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: block }} />
      ))}
      <ChecklistHero />
      <ChecklistList />
      <ChecklistFinalCta />
    </>
  )
}
