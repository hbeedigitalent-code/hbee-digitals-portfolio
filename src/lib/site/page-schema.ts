/**
 * Page-level JSON-LD for public pages that are neither Services nor Insights:
 * a WebPage and its BreadcrumbList. Deliberately nothing else (no FAQPage,
 * Service, prices, ratings, reviews or areaServed). Returned as ready-to-embed,
 * script-safe JSON strings. Relative imports only (offline tests load this file).
 */
import { SITE_URL } from '../blog-utils'

interface PageSchemaInput {
  /** Site-relative path, e.g. "/how-we-work". */
  path: string
  name: string
  description: string
  /** Breadcrumb label for this page. */
  breadcrumb: string
}

const safe = (value: unknown) => JSON.stringify(value).replace(/</g, '\u003c')

export function pageJsonLd({ path, name, description, breadcrumb }: PageSchemaInput): string[] {
  const url = `${SITE_URL}${path}`
  return [
    safe({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name,
      description,
      isPartOf: { '@type': 'WebSite', url: SITE_URL },
      publisher: { '@id': `${SITE_URL}#organization` },
    }),
    safe({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: breadcrumb, item: url },
      ],
    }),
  ]
}
