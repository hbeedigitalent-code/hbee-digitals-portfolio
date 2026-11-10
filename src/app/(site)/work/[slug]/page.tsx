import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { WorkDetailPage } from '@/components/site/work/WorkDetail'
import { getNextWork, getWorkDetail, getWorkSeo } from '@/lib/site/work-data'
import { pageMetadata } from '@/lib/site/seo'

/**
 * Case study (/work/[slug]). 404 for any slug that does not resolve to an
 * active, valid portfolio_items row (read with the public anon client).
 */
export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const seo = await getWorkSeo(params.slug)
  if (!seo) return { title: 'Case study not found', robots: { index: false, follow: false } }
  return pageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/work/${params.slug}`,
    ogImage: seo.image,
    ogImageAlt: seo.imageAlt,
  })
}

export default async function CaseStudyPage({ params }: { params: { slug: string } }) {
  const detail = await getWorkDetail(params.slug)
  if (!detail) notFound()
  // A Case Study has exactly one canonical page; never render a second copy here.
  if (detail.creative?.caseStudy) redirect(`/case-studies/${params.slug}`)
  // Next-project navigation belongs to the creative experience only (flag on).
  const next = detail.creative ? await getNextWork(params.slug) : null
  return <WorkDetailPage detail={detail} next={next} />
}
