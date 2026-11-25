import type { ShowcaseItem } from '@/lib/site/showcase-model'
import { MediaShowcase } from '../media/MediaShowcase'

/**
 * Headings per capability. Neutral on purpose: a placed piece is an example of the work, and nothing here claims it was a
 * client campaign. Only explicitly placed, switched-on assets appear; a Media Library category never adds anything.
 */
const HEADINGS: Record<string, { eyebrow: string; heading: string }> = {
  'creative-ugc': { eyebrow: 'UGC and creative', heading: 'Selected creative work' },
  'brand-positioning': { eyebrow: 'Brand and identity', heading: 'Selected work' },
}
const DEFAULT = { eyebrow: 'Examples', heading: 'Selected work' }

export function CapabilityShowcase({ slug, items = [] }: { slug: string; items?: ShowcaseItem[] }) {
  const copy = HEADINGS[slug] ?? DEFAULT
  return <MediaShowcase id="capability-showcase" items={items} eyebrow={copy.eyebrow} heading={copy.heading} />
}
