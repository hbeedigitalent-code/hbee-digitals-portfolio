/**
 * Page-level JSON-LD for public pages that are neither Services nor Insights:
 * a WebPage (or AboutPage) and its BreadcrumbList. The organization is always
 * referenced by @id (the one global Organization node), never redefined.
 * Deliberately nothing else (no FAQPage, Person, Service, prices, ratings,
 * reviews, awards or areaServed). Returned as ready-to-embed,
 * script-safe JSON strings. Relative imports only (offline tests load this file).
 */
import { SITE_URL } from '../blog-utils'

/** The one WebSite node (declared once in StructuredData.tsx); pages reference it, never redefine it. */
export const WEBSITE_ID = `${SITE_URL}#website`

interface PageSchemaInput {
  /** Site-relative path, e.g. "/how-we-work". */
  path: string
  name: string
  description: string
  /** Breadcrumb label for this page. */
  breadcrumb: string
  /** 'AboutPage' for /about, 'CollectionPage' for listing hubs; every other page is a plain WebPage. */
  type?: 'WebPage' | 'AboutPage' | 'CollectionPage'
  /** Intermediate breadcrumb steps between Home and this page (e.g. Work → project). */
  trail?: { name: string; path: string }[]
}

const safe = (value: unknown) => JSON.stringify(value).replace(/</g, '\u003c')

export function pageJsonLd({ path, name, description, breadcrumb, type = 'WebPage', trail = [] }: PageSchemaInput): string[] {
  const url = `${SITE_URL}${path}`
  return [
    safe({
      '@context': 'https://schema.org',
      '@type': type,
      '@id': `${url}#webpage`,
      url,
      name,
      description,
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': `${SITE_URL}#organization` },
      ...(type === 'AboutPage' ? { about: { '@id': `${SITE_URL}#organization` } } : {}),
    }),
    safe({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        ...trail.map((step, i) => ({ '@type': 'ListItem', position: i + 2, name: step.name, item: `${SITE_URL}${step.path}` })),
        { '@type': 'ListItem', position: trail.length + 2, name: breadcrumb, item: url },
      ],
    }),
  ]
}
