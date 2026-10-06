import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { WorkDetailPage } from '@/components/site/work/WorkDetail'
import { getWorkDetail } from '@/lib/site/work-data'

/**
 * /rebuild-work/[slug] — the rebuilt case-study page, isolated for owner
 * review (Phase 12). Rebuild equivalent of the future /work/[slug].
 *
 * Unlinked from production, not in the sitemap, noindex, 404 on any Vercel
 * production build, and 404 for any slug that does not resolve to an active,
 * valid portfolio_items row (read with the public anon client). The live
 * /portfolio/[slug] route is untouched.
 */
export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const detail = process.env.VERCEL_ENV === 'production' ? null : await getWorkDetail(params.slug)
  return {
    title: detail ? `Rebuild work: ${detail.headline}` : 'Rebuild work',
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  }
}

export default async function RebuildCaseStudyPage({ params }: { params: { slug: string } }) {
  if (process.env.VERCEL_ENV === 'production') notFound()
  const detail = await getWorkDetail(params.slug)
  if (!detail) notFound()
  return <WorkDetailPage detail={detail} />
}
