import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { WorkCollection, WorkCta, WorkHero } from '@/components/site/work/WorkSections'
import { getWorkData } from '@/lib/site/work-data'

/**
 * Work / case studies landing (/work).
 *
 * Server component: portfolio data is read here, server-side, through the
 * public anon loader. The only client code is the shared nav, SiteReveal
 * triggers and the category filter.
 */
export const revalidate = 300

export const metadata: Metadata = pageMetadata({
  title: 'Work',
  description:
    'Explore how Hbee helps businesses solve real challenges, improve customer experiences and build stronger growth systems through strategy, design, technology and creative — all connected.',
  path: '/work',
})

export default async function WorkPage() {

  const data = await getWorkData()

  return (
    <>
      <WorkHero />
      <WorkCollection data={data} />
      <WorkCta />
    </>
  )
}
