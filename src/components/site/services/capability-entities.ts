/**
 * CAPABILITY ENTITIES — the single semantic model behind /services, every
 * /services/[capability] page, the navigation, the footer and Work labels.
 *
 * Three layers are deliberate and are NOT forced to share wording:
 *
 *   module identity   Hbee brand language   Brand · Experience · Technology · Creative · Discovery · Growth
 *   capability name   commercial language   e.g. "Website & Conversion"
 *   page H1 / copy    search / answer language (lives in capability-content.ts)
 *
 * Route slugs are unchanged and are also the `portfolio_capabilities` values;
 * they must never be edited here. Relative imports only (offline tests load
 * this file directly).
 */

export type ModuleName = 'Brand' | 'Experience' | 'Technology' | 'Creative' | 'Discovery' | 'Growth'

export type CapabilitySlug =
  | 'brand-positioning'
  | 'digital-systems'
  | 'creative-ugc'
  | 'discovery-traffic'
  | 'commerce-experience'
  | 'retention-growth'

export interface CapabilityEntity {
  slug: CapabilitySlug
  href: string
  /** Hbee module identity (brand language, never an H1). */
  module: ModuleName
  /** Semantic capability name (commercial language). */
  name: string
  /** Self-contained one-sentence definition; must make sense out of context. */
  definition: string
  /** Recognizable merchant problems this capability addresses. */
  problems: string[]
  /** Core work, named plainly. */
  coreWork: string[]
  /** Adjacent capabilities in the connected system, nearest first. */
  adjacent: CapabilitySlug[]
  /** Descriptive link text for this capability (replaces "Learn more"). */
  linkLabel: string
}

export const CAPABILITY_ENTITIES: Record<CapabilitySlug, CapabilityEntity> = {
  'brand-positioning': {
    slug: 'brand-positioning',
    href: '/services/brand-positioning',
    module: 'Brand',
    name: 'Brand & Positioning',
    definition:
      'Clarifies who an ecommerce brand is for, what makes it different and how its offer should be understood, so every other part of the store has a clear message to carry.',
    problems: ['Shoppers cannot tell how the brand differs from alternatives', 'Messaging changes from page to page and channel to channel'],
    coreWork: ['Audience and positioning', 'Value proposition and messaging', 'Brand identity direction'],
    adjacent: ['commerce-experience', 'creative-ugc', 'discovery-traffic'],
    linkLabel: 'Explore Brand & Positioning',
  },
  'commerce-experience': {
    slug: 'commerce-experience',
    href: '/services/commerce-experience',
    module: 'Experience',
    name: 'Website & Conversion',
    definition:
      'Improves the Shopify storefront journey, including navigation, product and collection pages, product presentation, offer clarity, trust and mobile usability, so more qualified visitors understand, trust and buy.',
    problems: ['Traffic arrives but sales stay low', 'Product pages do not answer buying questions or present the offer clearly'],
    coreWork: ['Conversion and journey review', 'Product-page and offer communication', 'Mobile, navigation and checkout friction'],
    adjacent: ['brand-positioning', 'digital-systems', 'discovery-traffic'],
    linkLabel: 'Explore Website & Conversion',
  },
  'digital-systems': {
    slug: 'digital-systems',
    href: '/services/digital-systems',
    module: 'Technology',
    name: 'Digital Systems & Analytics',
    definition:
      'Connects the ecommerce tools, integrations and automation behind a store and sets up the tracking and measurement that let a business see what is happening and act on it.',
    problems: ['Performance data is unclear, incomplete or untrusted', 'Tools and workflows are disconnected and depend on manual work'],
    coreWork: ['Tracking, integrations & automation', 'Analytics and reporting foundations', 'Diagnostics and measurement reliability'],
    adjacent: ['commerce-experience', 'retention-growth', 'discovery-traffic'],
    linkLabel: 'Explore Digital Systems & Analytics',
  },
  'creative-ugc': {
    slug: 'creative-ugc',
    href: '/services/creative-ugc',
    module: 'Creative',
    name: 'Creative & UGC',
    definition:
      'Produces product videos, creator-led content and ad creative that show what a product is, why it matters and why customers can believe it.',
    problems: ['Ads and product content fail to hold attention', 'Product pages lack real demonstration and customer proof'],
    coreWork: ['UGC and product video', 'Ad and landing-page creative', 'Creative testing direction'],
    adjacent: ['discovery-traffic', 'commerce-experience', 'brand-positioning'],
    linkLabel: 'Explore Creative & UGC',
  },
  'discovery-traffic': {
    slug: 'discovery-traffic',
    href: '/services/discovery-traffic',
    module: 'Discovery',
    name: 'Traffic & Visibility',
    definition:
      'Helps the right buyers find an ecommerce brand through search, content and acquisition channels that fit the business.',
    problems: ['The store is hard to find in search', 'Traffic is inconsistent or does not match likely buyers'],
    coreWork: ['Ecommerce SEO and content', 'Campaign and landing-page alignment', 'Channel fit and traffic quality'],
    adjacent: ['commerce-experience', 'creative-ugc', 'digital-systems'],
    linkLabel: 'Explore Traffic & Visibility',
  },
  'retention-growth': {
    slug: 'retention-growth',
    href: '/services/retention-growth',
    module: 'Growth',
    name: 'Retention & Customer Value',
    definition:
      'Builds lifecycle email, Klaviyo and post-purchase systems that turn first purchases into repeat customers and higher customer value.',
    problems: ['Customers buy once and do not return', 'Abandoned carts and post-purchase moments go unused'],
    coreWork: ['Welcome, abandonment and post-purchase flows', 'Segmentation and campaigns', 'Repeat-purchase planning'],
    adjacent: ['commerce-experience', 'digital-systems', 'creative-ugc'],
    linkLabel: 'Explore Retention & Customer Value',
  },
}

/** System reading order on the Services hub (matches the existing groups). */
export const CAPABILITY_ORDER: CapabilitySlug[] = [
  'brand-positioning',
  'digital-systems',
  'creative-ugc',
  'discovery-traffic',
  'commerce-experience',
  'retention-growth',
]

export function capabilityEntity(slug: string): CapabilityEntity | undefined {
  return (CAPABILITY_ENTITIES as Record<string, CapabilityEntity | undefined>)[slug]
}

/** Public module artwork per module (existing canonical 3D assets). */
export const MODULE_IMAGE: Record<ModuleName, string> = {
  Brand: '/brand/modules/brand.webp',
  Experience: '/brand/modules/experience.webp',
  Technology: '/brand/modules/technology.webp',
  Creative: '/brand/modules/creative.webp',
  Discovery: '/brand/modules/discovery.webp',
  Growth: '/brand/modules/growth.webp',
}

/**
 * Symptom-based routing for the hub. Each symptom leads to the capability
 * most likely to address it. Product & Offer is a service area INSIDE
 * Website & Conversion (not a seventh capability) and is named explicitly.
 */
export interface MerchantSymptom {
  symptom: string
  explanation: string
  capability: CapabilitySlug
  /** Set when the symptom belongs to a named service area inside the capability. */
  serviceArea?: string
  /** Anchor on the capability page, when one exists. */
  anchor?: string
}

export const MERCHANT_SYMPTOMS: MerchantSymptom[] = [
  {
    symptom: 'Traffic but low sales',
    explanation: 'Visitors arrive and leave. The cause is usually in the storefront journey, not in the number of visitors.',
    capability: 'commerce-experience',
  },
  {
    symptom: 'Shoppers view products but do not buy',
    explanation: 'Product presentation, offer structure or price-to-value communication may not be giving shoppers enough reason to act.',
    capability: 'commerce-experience',
    serviceArea: 'Product & Offer',
    anchor: '#product-and-offer',
  },
  {
    symptom: 'Unclear differentiation',
    explanation: 'The brand looks and sounds like its competitors, so price becomes the only way to choose.',
    capability: 'brand-positioning',
  },
  {
    symptom: 'Weak product creative',
    explanation: 'Ads and product content do not show the product in use or give customers a reason to believe.',
    capability: 'creative-ugc',
  },
  {
    symptom: 'Low discovery in search and channels',
    explanation: 'The right buyers cannot find the store, or the traffic that arrives does not fit the offer.',
    capability: 'discovery-traffic',
  },
  {
    symptom: 'Low repeat purchasing',
    explanation: 'First orders do not turn into relationships because lifecycle and post-purchase systems are thin or missing.',
    capability: 'retention-growth',
  },
  {
    symptom: 'Unclear performance or fragmented systems',
    explanation: 'Tracking, integrations and reporting do not agree, so it is hard to tell what is actually limiting growth.',
    capability: 'digital-systems',
  },
]
