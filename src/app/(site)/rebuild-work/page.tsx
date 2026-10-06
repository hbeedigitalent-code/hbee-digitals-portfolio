import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { WorkCollection, WorkCta, WorkHero } from '@/components/site/work/WorkSections'
import { getWorkData } from '@/lib/site/work-data'

/**
 * /rebuild-work — the new Work / case studies landing page, isolated for
 * owner review (Phase 11).
 *
 * Same protection as the other rebuild routes: unlinked, not in the sitemap,
 * noindex, and 404 on any Vercel production build. The live /portfolio
 * routes are untouched; project actions point at the existing public
 * /portfolio/[slug] detail route until the /work migration.
 *
 * Server component: portfolio data is read here, server-side, through the
 * public anon loader. The only client code is the shared nav, SiteReveal
 * triggers and the category filter.
 */
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Rebuild work',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default async function RebuildWorkPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const data = await getWorkData()

  return (
    <>
      <WorkHero />
      <WorkCollection data={data} />
      <WorkCta />
    </>
  )
}
