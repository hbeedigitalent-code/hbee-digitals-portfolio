/**
 * Metadata helper for the public site.
 *
 * The root layout intentionally has no canonical or Open Graph URL because
 * Next.js would inherit them into unrelated utility routes. Every indexable
 * public route therefore goes through this helper, which always sets its own
 * canonical, Open Graph and Twitter metadata.
 *
 * `title` goes through the root `%s | Hbee Digitals` template; `absoluteTitle`
 * bypasses it (used where an approved full title already exists).
 */

import type { Metadata } from 'next'

import { SITE_URL } from '@/lib/blog-utils'
import { defaultSocialImage, type SocialImage } from '@/lib/site/social-image'

interface PageMetadataInput {
  title?: string
  absoluteTitle?: string
  description: string
  /** Site-relative path, e.g. "/services". */
  path: string
  /**
   * A deliberate social image for this page (e.g. a generated article card). Its declared size must be its true size: build it with
   * generatedSocialImage() / defaultSocialImage() from social-image.ts. Omit to inherit the Hbee default.
   */
  socialImage?: SocialImage
}

const SITE_NAME = 'Hbee Digitals'

export function pageMetadata({ title, absoluteTitle, description, path, socialImage }: PageMetadataInput): Metadata {
  const url = `${SITE_URL}${path === '/' ? '' : path}`
  const socialTitle = absoluteTitle ?? (title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Digital Growth Studio`)
  const image = socialImage ?? defaultSocialImage()
  return {
    ...(absoluteTitle ? { title: { absolute: absoluteTitle } } : title ? { title } : {}),
    description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: image.url, width: image.width, height: image.height, type: image.type, alt: image.alt }],
    },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [{ url: image.url, alt: image.alt }] },
  }
}

/** Pages that must stay out of search results (confirmation states). */
export const NOINDEX: Pick<Metadata, 'robots'> = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}
