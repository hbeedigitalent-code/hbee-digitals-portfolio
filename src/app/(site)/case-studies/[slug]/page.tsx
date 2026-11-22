import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { CaseStudyPage } from '@/components/site/work/CaseStudySections'
import { portfolioCreativeEnabled } from '@/lib/portfolio-creative'
import { pageMetadata } from '@/lib/site/seo'
import { generatedSocialImage } from '@/lib/site/social-image'
import { pageJsonLd } from '@/lib/site/page-schema'
import { getRelatedWork, getWorkDetail, getWorkSeo } from '@/lib/site/work-data'

/**
 * Case Study (/case-studies/[slug]) is the canonical deep page for a project
 * marked as a Case Study. Flag off => 404. A valid project that is NOT a Case
 * Study redirects to its Standard Work page, so there is never a second copy.
 */
export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const seo = portfolioCreativeEnabled() ? await getWorkSeo(params.slug) : null
  if (!seo) return { title: 'Case study not found', robots: { index: false, follow: false } }
  return pageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/case-studies/${params.slug}`,
    // A generated 1200×630 card (project name + Hbee identity), not the raw hero image, whatever its ratio or weight.
    socialImage: generatedSocialImage('work', params.slug, `${seo.title} — a Hbee Digitals case study`, [seo.title]),
  })
}

export default async function CaseStudyRoute({ params }: { params: { slug: string } }) {
  if (!portfolioCreativeEnabled()) notFound()
  const detail = await getWorkDetail(params.slug)
  if (!detail) notFound()
  if (!detail.creative?.caseStudy) redirect(`/work/${params.slug}`)
  const jsonLd = pageJsonLd({
    path: `/case-studies/${params.slug}`,
    name: detail.headline,
    description: detail.summary ?? `${detail.client}: a Hbee Digitals case study.`,
    breadcrumb: detail.client,
    trail: [{ name: 'Work', path: '/work' }, { name: 'Case Studies', path: '/case-studies' }],
  })
  return (
    <>
      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: block }} />
      ))}
      <CaseStudyPage detail={detail} related={await getRelatedWork(params.slug)} />
    </>
  )
}
