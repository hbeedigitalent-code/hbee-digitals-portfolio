import type { Metadata } from 'next'

import { pageMetadata } from '@/lib/site/seo'
import { getCapabilityWork } from '@/lib/site/portfolio-creative-data'
import { CapabilityDetailPage } from '@/components/site/capability/CapabilityDetailPage'
import { CAPABILITY_DETAILS, capabilityIdentity } from '@/components/site/capability/capability-content'
import { SITE_URL } from '@/lib/blog-utils'

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
  const detail = CAPABILITY_DETAILS[params.capability]
  const name = capabilityIdentity(params.capability)?.capability.name
  const url = `${SITE_URL}/services/${params.capability}`
  const ldJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

  return (
    <>
      {detail && name && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: ldJson({
                '@context': 'https://schema.org',
                '@type': 'Service',
                '@id': `${url}#service`,
                name,
                description: detail.hero.summary,
                url,
                provider: { '@id': `${SITE_URL}#organization` },
              }),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: ldJson({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                  { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                  { '@type': 'ListItem', position: 2, name: 'Services', item: `${SITE_URL}/services` },
                  { '@type': 'ListItem', position: 3, name, item: url },
                ],
              }),
            }}
          />
        </>
      )}
      <CapabilityDetailPage slug={params.capability} work={work} />
    </>
  )
}
