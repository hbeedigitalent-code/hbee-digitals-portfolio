import type { Metadata } from 'next'

import { pageMetadata } from '@/lib/site/seo'
import { getInsightsData } from '@/lib/site/insights-data'
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
    title: detail.seo.title,
    description: detail.seo.description,
    path: `/services/${params.capability}`,
  })
}

export default async function CapabilityPage({ params }: { params: { capability: string } }) {
  const detail = CAPABILITY_DETAILS[params.capability]
  const name = capabilityIdentity(params.capability)?.capability.name
  const [work, insightData] = await Promise.all([
    getCapabilityWork(params.capability),
    detail?.insightSlugs.length ? getInsightsData() : Promise.resolve({ items: [], topics: [] }),
  ])
  const insightOrder = new Map(detail?.insightSlugs.map((slug, index) => [slug, index]) ?? [])
  const insights = insightData.items
    .filter((item) => insightOrder.has(item.slug))
    .sort((a, b) => insightOrder.get(a.slug)! - insightOrder.get(b.slug)!)
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
                description: detail.seo.description,
                url,
                provider: { '@id': `${SITE_URL}#organization` },
                // Only for capabilities whose page states its service type and audience in visible text.
                ...(detail.semantic
                  ? { serviceType: detail.semantic.serviceType, audience: { '@type': 'Audience', audienceType: 'Shopify and ecommerce brands' } }
                  : {}),
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
      <CapabilityDetailPage slug={params.capability} work={work} insights={insights} />
    </>
  )
}
