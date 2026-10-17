/** Existing trust_section.partner_logos JSON model. Array position is display order. */
export interface TrustLogo {
  [key: string]: unknown
  name: string
  logo: string
  active: boolean
  url?: string
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
    .map(item => ({ ...item, name: typeof item.name === 'string' ? item.name : '', logo: typeof item.logo === 'string' ? item.logo : '',
      active: item.active === undefined || item.active === true, ...(typeof item.url === 'string' ? { url: item.url } : {}) }))
}

export interface PublicTrustBrand { name: string; logo: string; url?: string }

export function publicTrustBrands(row: { is_active?: unknown; partner_logos?: unknown } | null): PublicTrustBrand[] {
  if (row?.is_active !== true) return []
  try {
    return parseTrustLogos(row.partner_logos).flatMap(item => {
      const name = item.name.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const logo = trustLogoUrl(item.logo)
      return item.active && name && logo ? [{ name, logo, url: trustLogoUrl(item.url) }] : []
    })
  } catch { return [] }
}

/** Only these columns are editable here; legacy copy/testimonials are never sent. */
export function trustBrandsPayload(logos: TrustLogo[], isActive: boolean) {
  return { partner_logos: logos.map(row => {
    const name = row.name.trim(), logo = row.logo.trim(), url = typeof row.url === 'string' ? row.url.trim() : ''
    if (!name || !trustLogoUrl(logo)) throw new Error('Each brand needs a name and a valid logo URL, including hidden brands. Remove incomplete rows before saving.')
    if (url && !trustLogoUrl(url)) throw new Error(`Use an HTTP(S) URL or local path for ${name}'s website.`)
    return { ...row, name, logo, active: row.active, ...(typeof row.url === 'string' ? { url } : {}) }
  }), is_active: isActive, updated_at: new Date().toISOString() }
}
