import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InsightDetailPage } from '@/components/site/insights/InsightDetail'
import { getInsightDetail } from '@/lib/site/insights-data'

/**
 * /rebuild-insights/[slug] — the rebuilt article page (Phase 14). Rebuild
 * equivalent of the future /insights/[slug].
 *
 * noindex; 404 on any Vercel production build; 404 for any slug that is not
 * a published blog_posts row. The live /blog/[slug] route is untouched.
 */
export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const detail = process.env.VERCEL_ENV === 'production' ? null : await getInsightDetail(params.slug)
  return {
    title: detail ? `Rebuild insight: ${detail.title}` : 'Rebuild insight',
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  }
}

export default async function RebuildInsightPage({ params }: { params: { slug: string } }) {
  if (process.env.VERCEL_ENV === 'production') notFound()
  const detail = await getInsightDetail(params.slug)
  if (!detail) notFound()
  return <InsightDetailPage detail={detail} />
}
