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
  /**
   * Typed video support (database v3). Optional so older callers and new,
   * not-yet-saved assets can omit them: the save RPC keeps stored values when a
   * key is absent. For a video, image_url is the POSTER and alt_text describes it.
   */
  media_kind?: 'image' | 'video'
  title?: string; description?: string
  video_url?: string | null; captions_url?: string | null; transcript?: string
}

const HTTPS_FILE_URL = /^https:\/\/[^\s<>"'\\]+$/i

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
    const kind = item.media_kind ?? 'image'
    if (kind !== 'image' && kind !== 'video') return 'Choose image or video as the media kind.'
    if ((item.title ?? '').length > 160 || (item.description ?? '').length > 600 || item.caption.length > 1000 || item.alt_text.length > 300 || (item.transcript ?? '').length > 20000) return 'A title, description, caption, alt text or transcript is too long.'
    for (const url of [item.video_url, item.captions_url]) if (url && (!HTTPS_FILE_URL.test(url) || url.length > 2048)) return 'Video and captions links must be HTTPS URLs.'
    if (kind === 'video') {
      if (!item.video_url) return 'A video needs an HTTPS video URL. The image is its poster.'
      if (!(item.title ?? '').trim() || !(item.description ?? '').trim()) return 'A video needs a title and a description.'
    } else if (item.video_url || item.captions_url || (item.transcript ?? '') !== '') return 'Only video assets can have a video URL, captions or a transcript.'
  }
}

/** Reject malformed rows rather than treating them as a new empty collection. */
export function readCreativeMedia(rows: unknown[]): PortfolioMedia[] {
  const media = rows.map((row) => {
    const r = row as Record<string, unknown>
    return { id: r.id, asset_type: r.asset_type, image_url: r.image_url, alt_text: r.alt_text,
      caption: r.caption ?? '', display_order: r.display_order, is_visible: r.is_visible,
      fit_mode: r.fit_mode, width: r.width ?? null, height: r.height ?? null,
      // Rows from a database without the v3 columns read as plain images.
      media_kind: r.media_kind ?? 'image', title: r.title ?? '', description: r.description ?? '',
      video_url: r.video_url ?? null, captions_url: r.captions_url ?? null, transcript: r.transcript ?? '' } as PortfolioMedia
  })
  if (media.some((m) => typeof m.alt_text !== 'string' || typeof m.caption !== 'string' || typeof m.is_visible !== 'boolean'
    || typeof m.title !== 'string' || typeof m.description !== 'string' || typeof m.transcript !== 'string')) throw new Error('Invalid creative media metadata.')
  const error = validateCreativeMedia(media, [])
  if (error) throw new Error(error)
  return media.sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
}

/**
 * Framing is decided by the editor's fit choice first, then by what we know about the image.
 * Dimensions are a helpful signal, not a rule:
 *   - artwork (logo, palette, type, stationery): always contained, square plate;
 *   - an explicit fit_mode (contain | cover) is always respected for everything else;
 *   - auto: only a KNOWN landscape website/storefront screenshot may fill its frame (cover);
 *     portrait/tall screenshots, mockups, brand applications and anything with unknown size are contained,
 *     so meaningful UI or composition is never cropped away;
 *   - the frame follows the real aspect ratio when known; very tall images are height-capped so they
 *     cannot become a screen-long strip (they stay fully visible, letterboxed inside the frame).
 */
export function mediaPresentation(media: PortfolioMedia) {
  const artwork = ['logo', 'alternate-logo', 'identity-system', 'colour-palette', 'typography', 'stationery'].includes(media.asset_type)
  const aspect = media.width && media.height ? media.width / media.height : undefined
  const landscapeScreenshot = aspect !== undefined && aspect >= 1.2 && ['website', 'storefront'].includes(media.asset_type)
  const fit = artwork ? 'contain' : media.fit_mode !== 'auto' ? media.fit_mode : landscapeScreenshot ? 'cover' : 'contain'
  const ratio = artwork ? '1 / 1' : media.width && media.height ? `${media.width} / ${media.height}` : media.asset_type === 'flyer' ? '3 / 4' : ['social-creative', 'packaging'].includes(media.asset_type) ? '1 / 1' : '16 / 10'
  const maxHeight = !artwork && aspect !== undefined && aspect < 0.75 ? '88vh' : undefined
  return { fit, ratio, artwork, maxHeight } as const
}

/**
 * Natural size of an image URL, measured in the browser. Resolves null (never rejects) when the image
 * cannot load, is not a valid portfolio image URL, has unusable dimensions, or no browser is available.
 * Reading naturalWidth/naturalHeight does not alter or re-encode the image.
 */
export function detectImageSize(url: string, timeoutMs = 8000): Promise<{ width: number; height: number } | null> {
  if (typeof Image === 'undefined' || !validPortfolioImage(url)) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const done = (value: { width: number; height: number } | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      img.onload = null
      img.onerror = null
      resolve(value)
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    img.onload = () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      done(Number.isSafeInteger(width) && Number.isSafeInteger(height) && width >= 1 && height >= 1 && width <= 20000 && height <= 20000 ? { width, height } : null)
    }
    img.onerror = () => done(null)
    img.src = url
  })
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
