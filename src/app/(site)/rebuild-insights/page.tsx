import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InsightsCollection, InsightsCta, InsightsHero } from '@/components/site/insights/InsightsSections'
import { getInsightsData } from '@/lib/site/insights-data'

/**
 * /rebuild-insights — the new Insights landing, isolated for owner review
 * (Phase 14). Rebuild equivalent of the future /insights.
 *
 * Unlinked from production, not in the sitemap, noindex, 404 on any Vercel
 * production build. The live /blog routes are untouched. Published
 * blog_posts are read server-side with the public anon client.
 */
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Rebuild insights',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default async function RebuildInsightsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()
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
