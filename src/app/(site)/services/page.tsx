import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/site/seo'

import { ServicesHero } from '@/components/site/services/ServicesHero'
import { ServicesCapabilitySystem } from '@/components/site/services/ServicesCapabilitySystem'
import { ServicesMethod } from '@/components/site/services/ServicesMethod'
import { ServicesWork } from '@/components/site/services/ServicesWork'
import { ServicesCta, ServicesFaq } from '@/components/site/services/ServicesSections'
import { getFeaturedWork } from '@/lib/site/home-data'

/**
 * Services / Capabilities (/services).
 *
 * Server component: real work is read here, server-side, through the
 * homepage's public loader (anon client, RLS). The only client code on the
 * page is SiteNav and the SiteReveal triggers; the FAQ is native HTML.
 */
export const revalidate = 300

export const metadata: Metadata = pageMetadata({
  title: 'Services & Capabilities',
  description:
    'Brand, technology, creative, customer experience, discovery and growth capabilities that work together — informed by a clear diagnosis and focused on measurable business progress.',
  path: '/services',
})

export default async function ServicesPage() {

  const work = await getFeaturedWork(3)

  return (
    <>
      <ServicesHero />
      <ServicesCapabilitySystem />
      <ServicesMethod />
      <ServicesWork work={work} />
      <ServicesCta />
      <ServicesFaq />
    </>
  )
}
