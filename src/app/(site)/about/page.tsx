import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

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
 * About (/about). People and the About image come only from the CMS (anon
 * reads, RLS); everything else is static positioning copy. No counters are
 * rendered.
 */
export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'Hbee Digitals is a digital growth studio helping ambitious businesses understand what should move next, build the right systems and create stronger customer experiences.',
  path: '/about',
})

export const revalidate = 60

export default async function AboutPage() {
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
