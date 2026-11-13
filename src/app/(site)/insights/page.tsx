import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { InsightsCapabilityBridge, InsightsCollection, InsightsCta, InsightsHero } from '@/components/site/insights/InsightsSections'
import { buildInsightsHubLd, getInsightsData } from '@/lib/site/insights-data'

/**
 * Insights landing (/insights). Published, publicly-eligible blog_posts are read
 * server-side with the public anon client.
 */
export const revalidate = 300

const HUB_NAME = 'Ecommerce Growth Insights for Shopify and Online Brands'
const HUB_DESCRIPTION =
  'Practical guidance from Hbee Digitals on positioning, conversion, digital systems, creative, search visibility and retention for Shopify and ecommerce brands.'

export const metadata: Metadata = pageMetadata({
  title: 'Ecommerce Growth Insights for Shopify Brands',
  description: HUB_DESCRIPTION,
  path: '/insights',
})

export default async function InsightsPage() {
  const data = await getInsightsData()
  const { collectionPage, breadcrumb } = buildInsightsHubLd(data.items, { name: HUB_NAME, description: HUB_DESCRIPTION })
  // Escape `<` so article-authored strings (titles) can't break out of the <script> tag.
  const ldJson = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\u003c')
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <InsightsHero lead={data.lead} />
      <InsightsCollection data={data} />
      <InsightsCapabilityBridge />
      <InsightsCta
        eyebrow="Insights into action"
        headline="Turn insight into action."
        copy="If you can see the problem but are not sure what to fix first, a focused Growth Review helps identify the priority."
      />
    </>
  )
}
