import type { Metadata } from 'next'

import { pageMetadata } from '@/lib/site/seo'
import { getCapabilityWork } from '@/lib/site/portfolio-creative-data'
import { CapabilityDetailPage } from '@/components/site/capability/CapabilityDetailPage'
import { CAPABILITY_DETAILS, capabilityIdentity } from '@/components/site/capability/capability-content'

/**
 * Capability detail pages (/services/[capability]). Only slugs with a content
 * object are built (dynamicParams = false); every other slug is a 404.
 */
export const dynamicParams = false
export const revalidate = 300

export function generateStaticParams() {
  return Object.keys(CAPABILITY_DETAILS).map((capability) => ({ capability }))
}

export function generateMetadata({ params }: { params: { capability: string } }): Metadata {
  const name = capabilityIdentity(params.capability)?.capability.name
  const detail = CAPABILITY_DETAILS[params.capability]
  if (!name || !detail) return { title: 'Capability not found', robots: { index: false, follow: false } }
  return pageMetadata({
    title: name,
    description: detail.hero.summary,
    path: `/services/${params.capability}`,
  })
}

export default async function CapabilityPage({ params }: { params: { capability: string } }) {
  const work = await getCapabilityWork(params.capability)
  return <CapabilityDetailPage slug={params.capability} work={work} />
}
