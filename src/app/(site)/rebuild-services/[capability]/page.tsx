import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CapabilityDetailPage } from '@/components/site/capability/CapabilityDetailPage'
import { CAPABILITY_DETAILS, capabilityIdentity } from '@/components/site/capability/capability-content'

/**
 * /rebuild-services/[capability] — capability-detail pages, isolated for
 * owner review (Phase 5). Only slugs with a content object are built
 * (dynamicParams = false): today that is /rebuild-services/brand-positioning
 * alone; every other slug is a 404.
 *
 * Same protection as /rebuild-services: unlinked, not in the sitemap,
 * noindex, and 404 on any Vercel production build. The live
 * /services/[slug] route is untouched.
 */
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(CAPABILITY_DETAILS).map((capability) => ({ capability }))
}

export function generateMetadata({ params }: { params: { capability: string } }): Metadata {
  const name = capabilityIdentity(params.capability)?.capability.name ?? 'Capability'
  return {
    title: `Rebuild ${name}`,
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  }
}

export default function RebuildCapabilityPage({ params }: { params: { capability: string } }) {
  if (process.env.VERCEL_ENV === 'production') notFound()
  return <CapabilityDetailPage slug={params.capability} />
}
