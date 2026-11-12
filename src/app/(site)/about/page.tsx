import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'
import { pageJsonLd } from '@/lib/site/page-schema'

import {
  AboutCta,
  AboutHero,
  AboutQuestions,
  AboutWork,
  BringTogether,
  MethodBridge,
  Principles,
  WhoWeWorkWith,
  WhyHbeeExists,
} from '@/components/site/about/AboutSections'
import { AboutTeam } from '@/components/site/about/AboutTeam'
import { getAboutData } from '@/lib/site/about-data'

/**
 * About (/about). People and the About image come only from the CMS (anon
 * reads, RLS); everything else is static positioning copy. No counters are
 * rendered. Page-level JSON-LD is AboutPage + BreadcrumbList only; the
 * organization is referenced by @id (no duplicate Organization, no Person, no
 * FAQPage — the questions are visible HTML).
 */
const TITLE = 'About Hbee Digitals | Digital Growth Studio for Shopify Brands'
const DESCRIPTION =
  'Hbee Digitals is a digital growth studio for Shopify and ecommerce brands. Meet the team and see how Hbee connects six capabilities around what is limiting growth.'

export const metadata: Metadata = pageMetadata({
  absoluteTitle: TITLE,
  description: DESCRIPTION,
  path: '/about',
})

export const revalidate = 60

export default async function AboutPage() {
  const data = await getAboutData()
  const photos = data.team.filter((m) => m.portrait).slice(0, 3).map((m) => m.portrait!)
  const jsonLd = pageJsonLd({
    type: 'AboutPage',
    path: '/about',
    name: 'About Hbee Digitals',
    description: DESCRIPTION,
    breadcrumb: 'About',
  })

  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: block }} />
      ))}
      <AboutHero photos={photos} />
      <WhyHbeeExists image={data.purposeImage} />
      <BringTogether />
      <MethodBridge />
      <AboutTeam team={data.team} />
      <Principles />
      <AboutWork />
      <WhoWeWorkWith />
      <AboutQuestions />
      <AboutCta />
    </>
  )
}
