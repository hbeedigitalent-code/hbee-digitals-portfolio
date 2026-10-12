import type { Metadata } from 'next'
import { NOINDEX } from '@/lib/site/seo'

import { SiteSection } from '@/components/site/primitives/SiteSection'
import { ReceivedState } from '@/components/site/growth-review/ReceivedState'

/**
 * Growth Review confirmation (/growth-review/received). Shows "Assessment
 * received" only for a tab holding the receipt marker set after a confirmed
 * submission; anyone else gets a neutral route back. Noindex.
 */
export const metadata: Metadata = {
  title: 'Growth Review received',
  ...NOINDEX,
}

export default function GrowthReviewReceivedPage() {
  return (
    <SiteSection tone="cloud" className="overflow-hidden">
      <ReceivedState />
    </SiteSection>
  )
}
