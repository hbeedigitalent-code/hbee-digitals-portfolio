/**
 * Metadata helper for the public site.
 *
 * The root layout sets `alternates.canonical` to the site root and a root-only
 * openGraph object. Next.js does not deep-merge those, so a page that does not
 * set its own canonical would inherit "/" — every public route therefore goes
 * through this helper, which always sets canonical, openGraph and twitter.
 *
 * `title` goes through the root `%s | Hbee Digitals` template; `absoluteTitle`
 * bypasses it (used where an approved full title already exists).
 */

import type { Metadata } from 'next'

import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/blog-utils'

interface PageMetadataInput {
  title?: string
  absoluteTitle?: string
  description: string
  /** Site-relative path, e.g. "/services". */
  path: string
  ogImage?: string
  ogImageAlt?: string
}

const SITE_NAME = 'Hbee Digitals'

export function pageMetadata({ title, absoluteTitle, description, path, ogImage, ogImageAlt }: PageMetadataInput): Metadata {
  const url = `${SITE_URL}${path === '/' ? '' : path}`
  const socialTitle = absoluteTitle ?? (title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Digital Growth Studio`)
  const image = ogImage ?? `${SITE_URL}${DEFAULT_OG_IMAGE}`
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
      images: [{ url: image, width: 1200, height: 630, alt: ogImageAlt ?? socialTitle }],
    },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [image] },
  }
}

/** Pages that must stay out of search results (confirmation states). */
export const NOINDEX: Pick<Metadata, 'robots'> = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}
