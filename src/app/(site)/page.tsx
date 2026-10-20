import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { HomeHero } from '@/components/site/home/HomeHero'
import { HomeBridge } from '@/components/site/home/HomeBridge'
import { HomeTrustedBrands } from '@/components/site/home/HomeTrustedBrands'
import { getHomepageBrands } from '@/lib/site/trusted-brands-data'
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
 * The homepage (/).
 *
 * Server component: all public CMS data is read here, server-side, and passed
 * down. Client code is limited to SiteNav, SiteReveal triggers and the
 * diagnostic selector.
 */
export const revalidate = 300

export const metadata: Metadata = pageMetadata({
  absoluteTitle: 'Hbee Digitals — Digital Growth Studio',
  description:
    'Hbee Digitals helps ambitious businesses diagnose what is limiting growth, then connect the right brand, digital, creative and commerce capabilities to move forward.',
  path: '/',
})

export default async function HomePage() {

  const [work, quotes, posts, brands] = await Promise.all([getFeaturedWork(3), getHomepageProof(3), getHomepageInsights(3), getHomepageBrands()])

  return (
    <>
      <HomeHero />
      <HomeBridge />
      <HomeTrustedBrands brands={brands} />
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
