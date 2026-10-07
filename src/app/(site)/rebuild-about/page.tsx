import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import {
  AboutCta,
  AboutHero,
  Beliefs,
  Difference,
  HowWeThink,
  Reach,
  WhoWeAre,
  WhoWeWorkWith,
} from '@/components/site/about/AboutSections'
import { AboutTeam } from '@/components/site/about/AboutTeam'
import { getAboutData } from '@/lib/site/about-data'

/**
 * /rebuild-about — the new About page, isolated for owner review (Phase 15).
 * Rebuild equivalent of the future /about.
 *
 * Unlinked from production, not in the sitemap, noindex, 404 on any Vercel
 * production build. The live /about route is untouched. People and the About
 * image come only from the CMS (anon reads, RLS); everything else is static
 * positioning copy. No counters are rendered.
 */
export const metadata: Metadata = {
  title: 'Rebuild about',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export const revalidate = 60

export default async function RebuildAboutPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  const data = await getAboutData()
  const photos = data.team.filter((m) => m.portrait).slice(0, 3).map((m) => m.portrait!)

  return (
    <>
      <AboutHero photos={photos} />
      <WhoWeAre image={data.purposeImage} />
      <Beliefs />
      <AboutTeam team={data.team} />
      <HowWeThink />
      <Difference />
      <Reach />
      <WhoWeWorkWith />
      <AboutCta />
    </>
  )
}
