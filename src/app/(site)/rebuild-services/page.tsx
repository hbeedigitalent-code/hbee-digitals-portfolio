import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ServicesHero } from '@/components/site/services/ServicesHero'
import { ServicesCapabilitySystem } from '@/components/site/services/ServicesCapabilitySystem'
import { ServicesMethod } from '@/components/site/services/ServicesMethod'
import { ServicesWork } from '@/components/site/services/ServicesWork'
import { ServicesCta, ServicesFaq } from '@/components/site/services/ServicesSections'
import { getFeaturedWork } from '@/lib/site/home-data'

/**
 * /rebuild-services — the new Services / Capabilities page, isolated for
 * owner review (Phase 4).
 *
 * Same protection as /rebuild-home: unlinked, not in the sitemap, noindex,
 * and 404 on any Vercel production build. The live /services and
 * /services/[slug] routes are untouched; at launch this content moves to
 * /services inside (site) and this route is deleted.
 *
 * Server component: real work is read here, server-side, through the
 * homepage's public loader (anon client, RLS). The only client code on the
 * page is SiteNav and the SiteReveal triggers; the FAQ is native HTML.
 */
export const revalidate = 300

export const metadata: Metadata = {
  title: 'Rebuild services',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default async function RebuildServicesPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

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
