/**
 * Editorial display labels for placements. This is the PRESENTATION layer: what a visitor reads under a piece of work in
 * one particular place. It does not replace the Media Library category (what the file is). Pure and safe on both sides;
 * the keys mirror the check constraint in scripts/admin-media-placement-01-forward.sql.
 */
type Kind = 'image' | 'video'
interface DisplayTypeInfo { label: string; kinds: readonly Kind[] }
const IMAGE: readonly Kind[] = ['image']
const VIDEO: readonly Kind[] = ['video']
const BOTH: readonly Kind[] = ['image', 'video']

export const DISPLAY_TYPES = {
  logo_design: { label: 'Logo Design', kinds: IMAGE },
  brand_identity: { label: 'Brand Identity', kinds: BOTH },
  brand_asset: { label: 'Brand Asset', kinds: BOTH },
  flyer_design: { label: 'Flyer Design', kinds: IMAGE },
  social_flyer: { label: 'Social Media Flyer', kinds: IMAGE },
  social_creative: { label: 'Social Media Creative', kinds: BOTH },
  campaign_creative: { label: 'Campaign Creative', kinds: BOTH },
  ugc_video: { label: 'UGC Video', kinds: VIDEO },
  creator_content: { label: 'Creator-Led Content', kinds: BOTH },
  product_creative: { label: 'Product Creative', kinds: BOTH },
  website_creative: { label: 'Website Creative', kinds: BOTH },
  store_experience: { label: 'Store Experience', kinds: BOTH },
  landing_page: { label: 'Landing Page Creative', kinds: BOTH },
  project_video: { label: 'Project Video', kinds: VIDEO },
  other: { label: 'Other / Custom', kinds: BOTH },
} as const satisfies Record<string, DisplayTypeInfo>

export type DisplayType = keyof typeof DISPLAY_TYPES

/** Admin wording for the six capability pages (keys are the public /services/<slug> routes). */
export const SERVICE_NAMES = {
  'brand-positioning': 'Brand & Positioning',
  'digital-systems': 'Digital Systems & Analytics',
  'creative-ugc': 'Creative & UGC',
  'discovery-traffic': 'Traffic & Visibility',
  'commerce-experience': 'Website & Conversion',
  'retention-growth': 'Retention & Customer Value',
} as const
export const CUSTOM_LABEL_MAX = 60

export const isDisplayType = (value: unknown): value is DisplayType => typeof value === 'string' && Object.prototype.hasOwnProperty.call(DISPLAY_TYPES, value)
export const allowsKind = (type: DisplayType, kind: Kind) => (DISPLAY_TYPES[type].kinds as readonly Kind[]).includes(kind)
export const displayTypesFor = (kind: Kind): DisplayType[] => (Object.keys(DISPLAY_TYPES) as DisplayType[]).filter((type) => allowsKind(type, kind))
/** What visitors read. "Other" shows the custom wording; an unknown type shows nothing. */
export const displayLabel = (type: string, custom: string): string =>
  type === 'other' ? custom.trim() : isDisplayType(type) ? DISPLAY_TYPES[type].label : ''
