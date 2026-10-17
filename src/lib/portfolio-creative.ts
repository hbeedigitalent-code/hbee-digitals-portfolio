import { validPortfolioImage } from './admin/portfolio-editor'

/** Enable only after owner-reviewed schema, RLS and storage verification. */
export const portfolioCreativeEnabled = () => process.env.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED === 'true'

export const ASSET_TYPES = {
  logo: 'Logo', 'alternate-logo': 'Alternate logo', 'identity-system': 'Identity system',
  'colour-palette': 'Colour palette', typography: 'Typography', stationery: 'Stationery',
  flyer: 'Flyer', 'social-creative': 'Social creative', 'campaign-graphic': 'Campaign graphic',
  mockup: 'Mockup', 'brand-application': 'Brand application', packaging: 'Packaging',
  website: 'Website', storefront: 'Storefront', other: 'Other',
} as const
export const CAPABILITY_SLUGS = ['brand-positioning', 'digital-systems', 'creative-ugc', 'discovery-traffic', 'commerce-experience', 'retention-growth'] as const
export type CapabilitySlug = typeof CAPABILITY_SLUGS[number]
export type AssetType = keyof typeof ASSET_TYPES
export type PortfolioMedia = {
  id: string; asset_type: AssetType; image_url: string; alt_text: string; caption: string
  display_order: number; is_visible: boolean; fit_mode: 'auto' | 'contain' | 'cover'
  width: number | null; height: number | null
}

export const isCapabilitySlug = (value: unknown): value is CapabilitySlug => typeof value === 'string' && (CAPABILITY_SLUGS as readonly string[]).includes(value)

export function validateCreativeMedia(media: PortfolioMedia[], capabilities: string[]): string | undefined {
  if (media.length > 100) return 'Use at most 100 assets per engagement.'
  if (!capabilities.every(isCapabilitySlug) || new Set(capabilities).size !== capabilities.length) return 'Select only the six approved capabilities, once each.'
  const ids = new Set<string>()
  for (const item of media) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(item.id) || ids.has(item.id)) return 'Each asset needs a unique valid identifier.'
    ids.add(item.id)
    if (!Object.prototype.hasOwnProperty.call(ASSET_TYPES, item.asset_type)) return 'Choose a supported asset type.'
    if (!validPortfolioImage(item.image_url) || item.image_url === '/') return 'Each asset needs an HTTPS image URL or local /path.'
    if (!item.alt_text.trim()) return 'Add meaningful alt text for every asset.'
    if (!['auto', 'contain', 'cover'].includes(item.fit_mode)) return 'Choose a supported fit mode.'
    if (!Number.isSafeInteger(item.display_order) || item.display_order < 0) return 'Asset order must be a non-negative whole number.'
    if ((item.width === null) !== (item.height === null)) return 'Provide both width and height, or leave both blank.'
    if ([item.width, item.height].some((n) => n !== null && (!Number.isSafeInteger(n) || n < 1 || n > 20000))) return 'Dimensions must be whole numbers from 1 to 20000.'
  }
}

/** Reject malformed rows rather than treating them as a new empty collection. */
export function readCreativeMedia(rows: unknown[]): PortfolioMedia[] {
  const media = rows.map((row) => {
    const r = row as Record<string, unknown>
    return { id: r.id, asset_type: r.asset_type, image_url: r.image_url, alt_text: r.alt_text,
      caption: r.caption ?? '', display_order: r.display_order, is_visible: r.is_visible,
      fit_mode: r.fit_mode, width: r.width ?? null, height: r.height ?? null } as PortfolioMedia
  })
  if (media.some((m) => typeof m.alt_text !== 'string' || typeof m.caption !== 'string' || typeof m.is_visible !== 'boolean')) throw new Error('Invalid creative media metadata.')
  const error = validateCreativeMedia(media, [])
  if (error) throw new Error(error)
  return media.sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
}

export function mediaPresentation(media: PortfolioMedia) {
  // Logos stay contained even if an older client submits an explicit cover fit.
  const artwork = ['logo', 'alternate-logo', 'identity-system', 'colour-palette', 'typography', 'stationery'].includes(media.asset_type)
  const fit = artwork ? 'contain' : media.fit_mode === 'auto' ? (['website', 'storefront', 'mockup', 'brand-application'].includes(media.asset_type) ? 'cover' : 'contain') : media.fit_mode
  const ratio = artwork ? '1 / 1' : media.width && media.height ? `${media.width} / ${media.height}` : media.asset_type === 'flyer' ? '3 / 4' : ['social-creative', 'packaging'].includes(media.asset_type) ? '1 / 1' : '16 / 10'
  return { fit, ratio, artwork } as const
}

export function reorderMedia(media: PortfolioMedia[], index: number, direction: -1 | 1) {
  const result = [...media]
  const target = index + direction
  if (index >= 0 && index < result.length && target >= 0 && target < result.length) [result[index], result[target]] = [result[target], result[index]]
  return result.map((item, display_order) => ({ ...item, display_order }))
}

/** Revisions travel as decimal strings; never round a PostgreSQL bigint in JS. */
export function creativeRevision(value: unknown): string {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) throw new Error('Invalid creative revision. Reload before saving.')
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^(0|[1-9]\d*)$/.test(String(value)) || BigInt(value) > 9223372036854775807n) throw new Error('Invalid creative revision. Reload before saving.')
  return String(value)
}

export function creativeSavePayload(portfolioId: string, media: PortfolioMedia[], capabilities: string[], revision: string, clearMedia = false, clearCapabilities = false) {
  const ordered = media.map((item, display_order) => ({ ...item, display_order }))
  const error = validateCreativeMedia(ordered, capabilities)
  if (error) throw new Error(error)
  if ((clearMedia && ordered.length) || (clearCapabilities && capabilities.length)) throw new Error('Clear-all intent must have an empty collection.')
  return { p_portfolio_id: portfolioId, p_media: ordered, p_capabilities: [...capabilities], p_expected_revision: creativeRevision(revision), p_clear_media: clearMedia, p_clear_capabilities: clearCapabilities }
}
