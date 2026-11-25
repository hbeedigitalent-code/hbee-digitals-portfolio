import type { Metadata } from 'next'
import { MediaShowcase } from '@/components/site/media/MediaShowcase'
import { getShowcase } from '@/lib/site/showcase-data'
import { pageMetadata } from '@/lib/site/seo'
import { pageJsonLd } from '@/lib/site/page-schema'

import { WorkCollection, WorkCta, WorkHero } from '@/components/site/work/WorkSections'
import { portfolioCreativeEnabled } from '@/lib/portfolio-creative'
import { getWorkData } from '@/lib/site/work-data'

/**
 * Work / case studies landing (/work).
 *
 * Server component: portfolio data is read here, server-side, through the
 * public anon loader. The only client code is the shared nav, SiteReveal
 * triggers and the category filter.
 */
export const revalidate = 300

const TITLE = 'Ecommerce Work & Case Studies'
const DESCRIPTION =
  'Selected Shopify and ecommerce projects by Hbee Digitals, with case studies on the business problem, the work and how brand, website, systems, creative, traffic and retention connect.'

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/work',
})

export default async function WorkPage() {

  const [data, creative] = await Promise.all([getWorkData(), getShowcase({ type: 'site', key: 'work', slot: 'creative_showcase' })])
  const jsonLd = pageJsonLd({ path: '/work', name: 'Ecommerce Work and Case Studies from Hbee Digitals', description: DESCRIPTION, breadcrumb: 'Work', type: 'CollectionPage' })

  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: block }} />
      ))}
      <WorkHero creative={portfolioCreativeEnabled()} caseStudies={data.items.some((item) => item.creative?.caseStudy)} />
      <WorkCollection data={data} />
      <MediaShowcase id="creative-work" items={creative} eyebrow="Creative portfolio" heading="Selected creative work" lede="Individual design and content pieces, shown on their own." />
      <WorkCta />
    </>
  )
}
