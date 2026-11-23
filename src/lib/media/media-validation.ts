import {
  CATEGORY_FOLDERS, isImageCategory, isMediaCategory, MEDIA_BUCKET,
  type ImageCategory,
} from './media-types'

/** Reasonable cap for graphics and logos. Existing uploaders use 5 MB; campaign artwork needs a little more. */
export const MEDIA_IMAGE_MAX_BYTES = 8 * 1024 * 1024
export const MEDIA_IMAGE_MAX_DIMENSION = 20000

export const MEDIA_IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
} as const
export type MediaImageMime = keyof typeof MEDIA_IMAGE_TYPES
export const MEDIA_IMAGE_ACCEPT = Object.keys(MEDIA_IMAGE_TYPES).join(',')

const GENERIC_MIME = ['', 'application/octet-stream']

export class MediaValidationError extends Error {}

/**
 * Identify an image from its first bytes. The filename and the browser-declared type are never the source of truth.
 * Returns null when the bytes are not one of the four supported raster formats.
 */
export function sniffImageMime(bytes: Uint8Array): MediaImageMime | null {
  const at = (offset: number, values: number[]) => values.every((value, index) => bytes[offset + index] === value)
  const ascii = (start: number, end: number) => String.fromCharCode(...Array.from(bytes.slice(start, end)))
  if (bytes.length >= 8 && at(0, [137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png'
  if (bytes.length >= 3 && at(0, [255, 216, 255])) return 'image/jpeg'
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (bytes.length >= 16 && ascii(4, 8) === 'ftyp') {
    // ISO-BMFF brands: major brand at 8..12, compatible brands follow.
    const brands = ascii(8, Math.min(bytes.length, 32))
    if (/avif|avis/.test(brands)) return 'image/avif'
  }
  return null
}

/** True when the leading bytes look like SVG / XML / HTML text, so the error can say why instead of "unsupported". */
export function looksLikeMarkup(bytes: Uint8Array): boolean {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 256)).replace(/^\uFEFF/, '').trimStart().toLowerCase()
  return head.startsWith('<svg') || head.startsWith('<?xml') || head.startsWith('<!doctype') || head.startsWith('<html') || head.startsWith('<script')
}

export interface ValidatedImage { mime: MediaImageMime; extension: string; size: number }

/** Size, MIME and magic-byte validation. Dimensions are read separately (browser decode). */
export function validateImageBytes(input: { size: number; declaredType: string; head: Uint8Array }): ValidatedImage {
  const { size, declaredType, head } = input
  if (!Number.isFinite(size) || size <= 0) throw new MediaValidationError('This file is empty.')
  if (size > MEDIA_IMAGE_MAX_BYTES) throw new MediaValidationError(`This file is ${(size / 1048576).toFixed(1)} MB. Images must be ${MEDIA_IMAGE_MAX_BYTES / 1048576} MB or smaller.`)
  const declared = (declaredType || '').toLowerCase()
  if (declared === 'image/svg+xml' || looksLikeMarkup(head)) {
    throw new MediaValidationError('SVG and other markup files are not accepted. Export the artwork as PNG, JPEG, WebP or AVIF.')
  }
  const sniffed = sniffImageMime(head)
  if (!sniffed) throw new MediaValidationError("Upload a PNG, JPEG, WebP or AVIF image. This file's contents are not a supported image.")
  if (!GENERIC_MIME.includes(declared) && declared !== sniffed && !(declared === 'image/jpg' && sniffed === 'image/jpeg')) {
    throw new MediaValidationError(`The file says it is ${declared} but its contents are ${sniffed}. Re-export it and try again.`)
  }
  return { mime: sniffed, extension: MEDIA_IMAGE_TYPES[sniffed], size }
}

export function validateDimensions(width: number, height: number): void {
  const ok = (n: number) => Number.isSafeInteger(n) && n >= 1 && n <= MEDIA_IMAGE_MAX_DIMENSION
  if (!ok(width) || !ok(height)) throw new MediaValidationError(`Image dimensions must be between 1 and ${MEDIA_IMAGE_MAX_DIMENSION} pixels.`)
}

/** Safe base name: ASCII, lowercase, hyphen separated, no extension, no path parts. Never empty. */
export function sanitizeFileBase(fileName: string, fallback = 'image'): string {
  const leaf = String(fileName ?? '').split(/[\\/]/).pop() ?? ''
  const withoutExtension = leaf.replace(/\.[A-Za-z0-9]{1,8}$/, '')
  const cleaned = withoutExtension
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '')
  return cleaned || fallback
}

/** A readable default title from the file name. */
export function defaultTitleFromFileName(fileName: string): string {
  const leaf = String(fileName ?? '').split(/[\\/]/).pop() ?? ''
  return leaf.replace(/\.[A-Za-z0-9]{1,8}$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
}

const TOKEN = /^[0-9a-f-]{8,36}$/i

/**
 * New-upload object path inside project-images: media/<category folder>/<base>-<token>.<ext>.
 * The extension comes from the SNIFFED type, never from the user's file name.
 */
export function buildObjectPath(category: ImageCategory, fileName: string, mime: MediaImageMime, token: string): string {
  if (!isImageCategory(category)) throw new MediaValidationError('Choose a valid category.')
  if (!TOKEN.test(token)) throw new MediaValidationError('Invalid upload token.')
  return `media/${CATEGORY_FOLDERS[category]}/${sanitizeFileBase(fileName)}-${token.toLowerCase()}.${MEDIA_IMAGE_TYPES[mime]}`
}

const SAFE_OBJECT_PATH = /^[A-Za-z0-9][A-Za-z0-9._/%()+,@=~ -]*$/
export function isSafeObjectPath(path: unknown): path is string {
  return typeof path === 'string' && path.length > 0 && path.length <= 400 && SAFE_OBJECT_PATH.test(path)
    && !path.includes('..') && !path.includes('//') && !path.endsWith('/')
}

export interface MediaMetadataInput { title: string; category: string; alt_text: string; is_decorative: boolean; caption: string }
export type MediaMetadataErrors = Partial<Record<keyof MediaMetadataInput, string>>

/** Required: title, category, alt text (unless explicitly marked decorative). */
export function validateMediaMetadata(input: MediaMetadataInput, options: { imageOnly?: boolean } = {}): MediaMetadataErrors {
  const errors: MediaMetadataErrors = {}
  const title = input.title.trim()
  if (!title) errors.title = 'Give the asset a name so it can be found later.'
  else if (title.length > 160) errors.title = 'Keep the name to 160 characters or fewer.'
  if (!isMediaCategory(input.category)) errors.category = 'Choose a category.'
  else if (options.imageOnly !== false && !isImageCategory(input.category)) errors.category = 'Video categories are not available yet. Choose an image category.'
  const alt = input.alt_text.trim()
  if (alt.length > 300) errors.alt_text = 'Keep alt text to 300 characters or fewer.'
  else if (!input.is_decorative && !alt) errors.alt_text = 'Describe the image for people who cannot see it, or tick "Decorative" if it conveys nothing.'
  if (input.caption.length > 1000) errors.caption = 'Keep the caption to 1000 characters or fewer.'
  return errors
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0

/** Row sent to media_assets on upload. created_by is filled by the database default (auth.uid()). */
export function buildInsertRow(input: {
  meta: MediaMetadataInput; category: ImageCategory; bucket?: string; objectPath: string; publicUrl: string
  mime: MediaImageMime; size: number; width: number; height: number; checksum: string | null
}) {
  const decorative = input.meta.is_decorative === true
  return {
    kind: 'image' as const,
    category: input.category,
    title: input.meta.title.trim(),
    alt_text: decorative ? '' : input.meta.alt_text.trim(),
    is_decorative: decorative,
    caption: input.meta.caption.trim(),
    bucket: input.bucket ?? MEDIA_BUCKET,
    object_path: input.objectPath,
    public_url: input.publicUrl,
    mime_type: input.mime,
    size_bytes: input.size,
    width: input.width,
    height: input.height,
    checksum: input.checksum,
    status: 'active' as const,
  }
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || /[\s<>"'\\]/.test(value)) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}
