/**
 * Code-side Insight → capability map. NAVIGATION / CONTEXT ONLY — it is not CMS
 * taxonomy. Stored tags stay the editorial topic labels; nothing here is
 * written to the database.
 *
 * One primary capability, optionally one secondary, or `null` for genuinely
 * cross-capability articles. Capability names and routes come from the single
 * approved six-capability source (SERVICE_GROUPS).
 *
 * Editorial opportunity: Digital Systems & Analytics has no dedicated Insight
 * yet (it appears only as a secondary on the redesign article). No article is
 * invented to fill the gap.
 */

import { SERVICE_GROUPS } from '../../components/site/services/services-content'

export interface InsightCapability {
  slug: string
  name: string
}

export const INSIGHT_CAPABILITIES: readonly InsightCapability[] = SERVICE_GROUPS.flatMap((group) =>
  group.capabilities.map((capability) => ({ slug: capability.slug, name: capability.name })),
)

export type InsightCapabilitySlug =
  | 'brand-positioning'
  | 'commerce-experience'
  | 'digital-systems'
  | 'creative-ugc'
  | 'discovery-traffic'
  | 'retention-growth'

export interface InsightCapabilityMapping {
  primary: InsightCapabilitySlug
  secondary?: InsightCapabilitySlug
}

export const INSIGHT_CAPABILITY_MAP: Readonly<Record<string, InsightCapabilityMapping | null>> = {
  'brand-positioning-vs-brand-identity': { primary: 'brand-positioning' },
  'first-five-things-customers-should-understand-about-your-brand': { primary: 'brand-positioning' },
  'how-to-write-clear-ecommerce-value-proposition': { primary: 'brand-positioning' },
  'identify-shopify-conversion-friction': { primary: 'commerce-experience' },
  'ecommerce-conversion-mistakes-costing-sales': { primary: 'commerce-experience' },
  'how-to-build-product-pages-that-answer-buying-questions': { primary: 'commerce-experience' },
  // Redesign vs optimization is a platform/foundation decision as well as a conversion one.
  'shopify-redesign-vs-optimization': { primary: 'commerce-experience', secondary: 'digital-systems' },
  'types-of-ugc-ecommerce-brand-needs': { primary: 'creative-ugc' },
  'why-shopify-store-not-appearing-google': { primary: 'discovery-traffic' },
  'klaviyo-flows-shopify-store-needs-first': { primary: 'retention-growth' },
  // Cross-capability.
  'november-2026-e-commerce-readiness': null,
  'q3-growth-readiness-why-most-ecommerce-stores-struggle-to-scale': null,
}

export function isInsightCapabilitySlug(value: unknown): value is InsightCapabilitySlug {
  return typeof value === 'string' && INSIGHT_CAPABILITIES.some((capability) => capability.slug === value)
}

export function insightCapabilityName(slug: string): string | undefined {
  return INSIGHT_CAPABILITIES.find((capability) => capability.slug === slug)?.name
}

/** [primary, secondary?] capability slugs for an article; empty for cross-capability / unmapped. */
export function insightCapabilitiesFor(articleSlug: string): InsightCapabilitySlug[] {
  const mapping = INSIGHT_CAPABILITY_MAP[articleSlug]
  if (!mapping) return []
  return mapping.secondary ? [mapping.primary, mapping.secondary] : [mapping.primary]
}

/** Query-string link for the hub's capability filter — shared by the hub and the mega-menu. */
export function insightCapabilityHref(slug: string): string {
  return `/insights?capability=${slug}`
}

/**
 * Articles whose natural ending is diagnosis / prioritisation (what to fix first,
 * or cross-capability uncertainty) get the closing Growth Review block. Others end
 * with their related capability and related Insights only.
 */
export const GROWTH_REVIEW_CTA_SLUGS: ReadonlySet<string> = new Set([
  'identify-shopify-conversion-friction',
  'ecommerce-conversion-mistakes-costing-sales',
  'shopify-redesign-vs-optimization',
  'q3-growth-readiness-why-most-ecommerce-stores-struggle-to-scale',
  'november-2026-e-commerce-readiness',
])
