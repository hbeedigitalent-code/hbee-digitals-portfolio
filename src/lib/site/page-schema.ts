/**
 * Page-level JSON-LD for public pages that are neither Services nor Insights:
 * a WebPage (or AboutPage) and its BreadcrumbList. The organization is always
 * referenced by @id (the one global Organization node), never redefined.
 * Deliberately nothing else (no FAQPage, Person, Service, prices, ratings,
 * reviews, awards or areaServed). Returned as ready-to-embed,
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
  /** 'AboutPage' for /about; every other page is a plain WebPage. */
  type?: 'WebPage' | 'AboutPage'
}

const safe = (value: unknown) => JSON.stringify(value).replace(/</g, '\u003c')

export function pageJsonLd({ path, name, description, breadcrumb, type = 'WebPage' }: PageSchemaInput): string[] {
  const url = `${SITE_URL}${path}`
  return [
    safe({
      '@context': 'https://schema.org',
      '@type': type,
      '@id': `${url}#webpage`,
      url,
      name,
      description,
      isPartOf: { '@type': 'WebSite', url: SITE_URL },
      publisher: { '@id': `${SITE_URL}#organization` },
      ...(type === 'AboutPage' ? { about: { '@id': `${SITE_URL}#organization` } } : {}),
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
