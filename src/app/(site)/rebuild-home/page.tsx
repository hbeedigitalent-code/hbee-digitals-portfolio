import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { HomeHero } from '@/components/site/home/HomeHero'
import { HomeBridge } from '@/components/site/home/HomeBridge'
import { HomeProblem } from '@/components/site/home/HomeProblem'
import { HomeConditions } from '@/components/site/home/HomeConditions'
import { HomeGrowthSystem } from '@/components/site/home/HomeGrowthSystem'
import { HomeCapabilities } from '@/components/site/home/HomeCapabilities'
import { HomeSelectedWork } from '@/components/site/home/HomeSelectedWork'
import {
  HomeDiagnosticSection,
  HomeFinalCta,
  HomeInsights,
  HomePrinciples,
  HomeProof,
} from '@/components/site/home/HomeSections'
import { getFeaturedWork, getHomepageInsights, getHomepageProof } from '@/lib/site/home-data'

/**
 * /rebuild-home — the new homepage, isolated for owner review (Phase 2).
 *
 * Same protection as /rebuild-preview: unlinked, not in the sitemap, noindex,
 * and 404 on any Vercel production build. At launch this page's content moves
 * to `/` inside (site) and this route is deleted.
 *
 * Server component: all public CMS data is read here, server-side, and passed
 * down. Client code is limited to SiteNav, SiteReveal triggers and the
 * diagnostic selector.
 */
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Rebuild home',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default async function RebuildHomePage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const [work, quotes, posts] = await Promise.all([getFeaturedWork(3), getHomepageProof(2), getHomepageInsights(3)])

  return (
    <>
      <HomeHero />
      <HomeBridge />
      <HomeProblem />
      <HomeConditions />
      <HomeGrowthSystem />
      <HomeCapabilities />
      <HomeSelectedWork work={work} />
      <HomeDiagnosticSection />
      <HomeProof quotes={quotes} />
      <HomePrinciples />
      <HomeInsights posts={posts} />
      <HomeFinalCta />
    </>
  )
}
