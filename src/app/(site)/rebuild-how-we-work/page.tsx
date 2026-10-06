import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

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
 * /rebuild-how-we-work — the new How We Work page, isolated for owner review
 * (Phase 13). Rebuild equivalent of the future /how-we-work.
 *
 * Unlinked from production, not in the sitemap, noindex, 404 on any Vercel
 * production build. The live /process route is untouched. Fully static: no
 * data reads. The Client Portal is linked through its existing, unchanged
 * login route.
 */
export const metadata: Metadata = {
  title: 'Rebuild how we work',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function RebuildHowWeWorkPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()
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
