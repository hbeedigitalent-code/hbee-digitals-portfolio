import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InsightDetailPage } from '@/components/site/insights/InsightDetail'
import { getInsightDetail, getInsightSeo } from '@/lib/site/insights-data'

/**
 * Article (/insights/[slug]). 404 for any slug that is not a published
 * blog_posts row. Metadata, canonical and BlogPosting / BreadcrumbList JSON-LD
 * carry over the rules of the former /blog/[slug] route.
 */
export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const seo = await getInsightSeo(params.slug)
  if (!seo) return { title: 'Article not found', robots: null }
  return {
    title: seo.title,
    description: seo.description,
    authors: [{ name: seo.author }],
    creator: seo.author,
    keywords: seo.keywords.length > 0 ? seo.keywords : undefined,
    alternates: { canonical: seo.canonical },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      url: seo.canonical,
      siteName: 'Hbee Digitals',
      type: 'article',
      publishedTime: seo.publishedAt,
      modifiedTime: seo.modifiedAt,
      images: [{ url: seo.image, width: 1200, height: 630, alt: seo.imageAlt }],
    },
    twitter: { card: 'summary_large_image', title: seo.ogTitle, description: seo.ogDescription, images: [seo.image] },
  }
}

export default async function InsightPage({ params }: { params: { slug: string } }) {
  const detail = await getInsightDetail(params.slug)
  if (!detail) notFound()
  const seo = await getInsightSeo(params.slug)
  // Escape `<` so post-authored strings can't break out of the <script> tag.
  const ldJson = (obj: unknown) => JSON.stringify(obj).replace(/</g, '\\u003c')
  return (
    <>
      {seo && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(seo.blogPostingLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(seo.breadcrumbLd) }} />
        </>
      )}
      <InsightDetailPage detail={detail} />
    </>
  )
}
