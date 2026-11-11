import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'
import { SITE_URL } from '@/lib/blog-utils'

import { ServicesHero } from '@/components/site/services/ServicesHero'
import { ServicesCapabilitySystem } from '@/components/site/services/ServicesCapabilitySystem'
import { ServicesSymptoms } from '@/components/site/services/ServicesSymptoms'
import { ServicesConnect } from '@/components/site/services/ServicesConnect'
import { ServicesMethod } from '@/components/site/services/ServicesMethod'
import { ServicesWork } from '@/components/site/services/ServicesWork'
import { ServicesCta, ServicesFaq } from '@/components/site/services/ServicesSections'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER } from '@/components/site/services/capability-entities'
import { getFeaturedWork } from '@/lib/site/home-data'

/**
 * Services hub (/services) — the semantic entry point for the six Hbee
 * capabilities: what Hbee helps ecommerce brands with, which symptom points to
 * which capability, how the capabilities depend on each other, proof, and the
 * Growth Review as the diagnostic route.
 *
 * Server component: real work is read here, server-side, through the
 * homepage's public loader (anon client, RLS). The only client code on the
 * page is SiteNav and the SiteReveal triggers; the FAQ is native HTML.
 */
export const revalidate = 300

const DESCRIPTION =
  'Hbee Digitals helps Shopify and e-commerce brands grow through six connected capabilities: brand, website and conversion, digital systems, creative, traffic and retention.'

export const metadata: Metadata = pageMetadata({
  title: 'Ecommerce Growth Services for Shopify Brands',
  description: DESCRIPTION,
  path: '/services',
})

const ldJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

export default async function ServicesPage() {
  const work = await getFeaturedWork(3)
  const url = `${SITE_URL}/services`

  /* Structured data mirrors visible content only: the page name, the six
     capability names and their links. Nothing about pricing, reviews or locations. */
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}#webpage`,
    url,
    name: 'Ecommerce Growth Services for Shopify Brands',
    description: DESCRIPTION,
    about: { '@id': `${SITE_URL}#organization` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: CAPABILITY_ORDER.map((slug, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: CAPABILITY_ENTITIES[slug].name,
        url: `${SITE_URL}${CAPABILITY_ENTITIES[slug].href}`,
      })),
    },
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Services', item: url },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <ServicesHero />
      <ServicesCapabilitySystem />
      <ServicesSymptoms />
      <ServicesConnect />
      <ServicesMethod />
      <ServicesWork work={work} />
      <ServicesCta />
      <ServicesFaq />
    </>
  )
}
