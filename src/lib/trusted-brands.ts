/** Existing trust_section.partner_logos JSON model. Array position is display order. */
export const TRUST_RELATIONSHIPS = ['none', 'client', 'partner', 'collaborated', 'featured_by', 'custom'] as const
export type TrustRelationship = (typeof TRUST_RELATIONSHIPS)[number]
/** Admin wording only. The relationship is an internal record and is NOT rendered on the public site. */
export const TRUST_RELATIONSHIP_LABELS: Record<TrustRelationship, string> = {
  none: 'No relationship stated',
  client: 'Client',
  partner: 'Partner',
  collaborated: 'Collaborated with',
  featured_by: 'Featured by',
  custom: 'Custom wording',
}
export const isTrustRelationship = (value: unknown): value is TrustRelationship =>
  typeof value === 'string' && (TRUST_RELATIONSHIPS as readonly string[]).includes(value)
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

export interface TrustLogo {
  [key: string]: unknown
  name: string
  logo: string
  active: boolean
  url?: string
  /** Media Library asset this logo was chosen from. Optional: legacy rows only have a logo URL. */
  asset_id?: string
  /** Accessible description of the logo. Blank = the brand name is used. */
  alt_text?: string
  /** Defaults to 'none'. Never claims a relationship the owner has not chosen. */
  relationship?: TrustRelationship
  /** Only stored when relationship is 'custom'. */
  relationship_label?: string
}

export const TRUST_LOGO_BUCKET = 'project-images'
export const TRUST_LOGO_ACCEPT = 'image/png,image/jpeg,image/webp'
const LOGO_EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export function trustLogoUpload(file: { type: string; size: number }, token: string) {
  const ext = LOGO_EXTENSIONS[file.type]
  if (!ext) throw new Error('Use a PNG, JPG, or WebP image. SVG uploads are not supported here.')
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error('Logo must be between 1 byte and 5 MB.')
  return { bucket: TRUST_LOGO_BUCKET, path: `trust-logos/${token.replace(/[^a-zA-Z0-9-]/g, '')}.${ext}` }
}

/** Check raster signatures as well as browser-provided MIME before storage upload. */
export function verifyTrustLogoBytes(buffer: ArrayBuffer, type: string) {
  const bytes = new Uint8Array(buffer)
  const at = (offset: number, values: number[]) => values.every((value, index) => bytes[offset + index] === value)
  const valid = type === 'image/png' ? at(0, [137,80,78,71,13,10,26,10])
    : type === 'image/jpeg' ? at(0, [255,216,255])
      : type === 'image/webp' && at(0, [82,73,70,70]) && at(8, [87,69,66,80])
  if (!valid) throw new Error('The file contents do not match a supported PNG, JPG, or WebP image.')
}

/** Accept existing raster/SVG references as image URLs, never inline markup. */
export function trustLogoUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const url = value.trim()
  if (!url || /[\s<>\\\u0000-\u001f]/.test(url)) return undefined
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return undefined
    return url
  } catch { return undefined }
}

/** JSON strings and arrays are both present in existing readers. Invalid JSON throws for admin safety. */
export function parseTrustLogos(raw: unknown): TrustLogo[] {
  const items = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (items == null) return []
  if (!Array.isArray(items)) throw new Error('Stored brand logos must be a JSON array.')
  return items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map(item => {
      const relationship = isTrustRelationship(item.relationship) ? item.relationship : 'none'
      const row: TrustLogo = { ...item, name: typeof item.name === 'string' ? item.name : '', logo: typeof item.logo === 'string' ? item.logo : '',
        active: item.active === undefined || item.active === true, relationship, ...(typeof item.url === 'string' ? { url: item.url } : {}) }
      if (typeof item.asset_id === 'string' && UUID.test(item.asset_id)) row.asset_id = item.asset_id; else delete row.asset_id
      if (typeof item.alt_text === 'string') row.alt_text = item.alt_text; else delete row.alt_text
      if (relationship === 'custom' && typeof item.relationship_label === 'string') row.relationship_label = item.relationship_label; else delete row.relationship_label
      return row
    })
}

/** Public shape. Deliberately has no relationship field: the relationship is admin metadata only. */
export interface PublicTrustBrand { name: string; logo: string; url?: string; alt?: string }

const plainText = (value: unknown) => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''

export function publicTrustBrands(row: { is_active?: unknown; partner_logos?: unknown } | null): PublicTrustBrand[] {
  if (row?.is_active !== true) return []
  try {
    return parseTrustLogos(row.partner_logos).flatMap(item => {
      const name = item.name.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const logo = trustLogoUrl(item.logo)
      const alt = plainText(item.alt_text).slice(0, 300)
      return item.active && name && logo ? [{ name, logo, url: trustLogoUrl(item.url), ...(alt ? { alt } : {}) }] : []
    })
  } catch { return [] }
}

/** Only these columns are editable here; legacy copy/testimonials are never sent. */
export function trustBrandsPayload(logos: TrustLogo[], isActive: boolean) {
  return { partner_logos: logos.map(row => {
    const name = row.name.trim(), logo = row.logo.trim(), url = typeof row.url === 'string' ? row.url.trim() : ''
    if (!name || !trustLogoUrl(logo)) throw new Error('Each brand needs a name and a valid logo URL, including hidden brands. Remove incomplete rows before saving.')
    if (url && !trustLogoUrl(url)) throw new Error(`Use an HTTP(S) URL or local path for ${name}'s website.`)
    const relationship = row.relationship ?? 'none'
    if (!isTrustRelationship(relationship)) throw new Error(`Choose a valid relationship for ${name}.`)
    const label = typeof row.relationship_label === 'string' ? row.relationship_label.trim() : ''
    if (relationship === 'custom' && (!label || label.length > 60)) throw new Error(`Enter custom relationship wording (up to 60 characters) for ${name}, or choose another relationship.`)
    const assetId = typeof row.asset_id === 'string' ? row.asset_id.trim() : ''
    if (assetId && !UUID.test(assetId)) throw new Error(`The linked Media Library asset for ${name} is invalid. Re-select the logo.`)
    const alt = typeof row.alt_text === 'string' ? row.alt_text.trim() : ''
    if (alt.length > 300) throw new Error(`Keep the logo description for ${name} to 300 characters or fewer.`)
    const next: Record<string, unknown> = { ...row, name, logo, active: row.active, relationship, ...(typeof row.url === 'string' ? { url } : {}) }
    if (relationship === 'custom') next.relationship_label = label; else delete next.relationship_label
    if (assetId) next.asset_id = assetId; else delete next.asset_id
    if (alt) next.alt_text = alt; else delete next.alt_text
    return next
  }), is_active: isActive, updated_at: new Date().toISOString() }
}
