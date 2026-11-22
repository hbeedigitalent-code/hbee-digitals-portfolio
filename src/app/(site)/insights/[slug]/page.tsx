import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InsightDetailPage } from '@/components/site/insights/InsightDetail'
import { getInsightDetail, getInsightSeo } from '@/lib/site/insights-data'
import { generatedSocialImage } from '@/lib/site/social-image'

/**
 * Article (/insights/[slug]). 404 for any slug that is not a published
 * blog_posts row. Metadata, canonical and BlogPosting / BreadcrumbList JSON-LD
 * carry over the rules of the former /blog/[slug] route.
 */
export const revalidate = 300

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const seo = await getInsightSeo(params.slug)
  if (!seo) return { title: 'Article not found', robots: null }
  // Link previews use a GENERATED 1200×630 card (article title + Hbee identity), never the raw featured image: featured images are
  // portrait, square or landscape and often several MB, which WhatsApp, LinkedIn and others show badly or not at all. The featured image
  // is still used by the page itself and by the BlogPosting structured data below.
  const card = generatedSocialImage('insights', params.slug, `${seo.ogTitle} — Hbee Digitals Insights`, [seo.ogTitle])
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
      images: [{ url: card.url, width: card.width, height: card.height, type: card.type, alt: card.alt }],
    },
    twitter: { card: 'summary_large_image', title: seo.ogTitle, description: seo.ogDescription, images: [{ url: card.url, alt: card.alt }] },
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
