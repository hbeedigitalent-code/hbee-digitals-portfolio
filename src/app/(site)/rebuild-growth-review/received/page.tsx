import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SiteSection } from '@/components/site/primitives/SiteSection'
import { ReceivedState } from '@/components/site/growth-review/ReceivedState'

/**
 * /rebuild-growth-review/received — the Growth Review confirmation (Phase
 * 16.4). Shows "Assessment received" only for a tab holding the receipt marker
 * set after a confirmed submission; anyone else gets a neutral route back.
 * Noindex, 404 on any Vercel production build.
 */
export const metadata: Metadata = {
  title: 'Rebuild growth review received',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default function RebuildGrowthReviewReceivedPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  return (
    <SiteSection tone="cloud" className="overflow-hidden">
      <ReceivedState />
    </SiteSection>
  )
}
