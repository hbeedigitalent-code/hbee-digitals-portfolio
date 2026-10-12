import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { InsightsCollection, InsightsCta, InsightsHero } from '@/components/site/insights/InsightsSections'
import { getInsightsData } from '@/lib/site/insights-data'

/**
 * Insights landing (/insights). Published blog_posts are read server-side with
 * the public anon client.
 */
export const revalidate = 300

export const metadata: Metadata = pageMetadata({
  title: 'Growth Insights',
  description:
    'Practical thinking on brand, commerce, customer experience, creative, discovery, retention and the digital systems that support sustainable growth.',
  path: '/insights',
})

export default async function InsightsPage() {
  const data = await getInsightsData()
  return (
    <>
      <InsightsHero lead={data.lead} />
      <InsightsCollection data={data} />
      <InsightsCta
        eyebrow="Insights into action"
        headline="Turn insight into action."
        copy="Explore what deserves attention in your business with a focused Growth Review."
      />
    </>
  )
}
