import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MEDIA_BUCKET, MEDIA_COLUMNS, isMediaCategory, isMediaKind, isMediaStatus,
  type ImageCategory, type MediaAsset, type MediaCategory, type MediaKind, type MediaStatus,
} from './media-types'
import {
  buildInsertRow, buildObjectPath, isHttpsUrl, validateMediaMetadata, hasErrors, MediaValidationError,
  type MediaImageMime, type MediaMetadataInput,
} from './media-validation'

/**
 * Data layer for the Admin Media Library. Every function takes the Supabase client as an argument, so the browser
 * session client is used in the app (RLS = active admin) and a mock is used in tests. No service-role key is involved.
 * There is deliberately NO hard-delete function: assets are archived, files are never removed from storage.
 */
type Db = Pick<SupabaseClient, 'from' | 'storage'>

export class MediaLibraryError extends Error {}

/** Escape LIKE wildcards so a search for "100%" or "a_b" is literal. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export interface MediaListOptions {
  search?: string
  category?: MediaCategory | ''
  kind?: MediaKind | ''
  status?: MediaStatus
  limit?: number
}

export async function listMediaAssets(db: Db, options: MediaListOptions = {}): Promise<MediaAsset[]> {
  const status = options.status && isMediaStatus(options.status) ? options.status : 'active'
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 120), 1), 500)
  let query = db.from('media_assets').select(MEDIA_COLUMNS).eq('status', status)
  if (options.category) {
    if (!isMediaCategory(options.category)) throw new MediaLibraryError('Unknown category filter.')
    query = query.eq('category', options.category)
  }
  if (options.kind) {
    if (!isMediaKind(options.kind)) throw new MediaLibraryError('Unknown type filter.')
    query = query.eq('kind', options.kind)
  }
  const search = (options.search ?? '').trim().slice(0, 100)
  if (search) query = query.ilike('title', `%${escapeLike(search)}%`)
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)
  if (error) throw new MediaLibraryError(friendlyDbError(error.message))
  return (data ?? []) as unknown as MediaAsset[]
}

/** Assets (active or archived) whose file bytes hash to the same SHA-256. */
export async function findAssetsByChecksum(db: Db, checksum: string | null): Promise<MediaAsset[]> {
  if (!checksum || !/^[0-9a-f]{64}$/.test(checksum)) return []
  const { data, error } = await db.from('media_assets').select(MEDIA_COLUMNS).eq('checksum', checksum).order('created_at', { ascending: false }).limit(5)
  if (error) throw new MediaLibraryError(friendlyDbError(error.message))
  return (data ?? []) as unknown as MediaAsset[]
}

export interface UploadImageInput {
  file: File
  mime: MediaImageMime
  width: number
  height: number
  checksum: string | null
  category: ImageCategory
  meta: MediaMetadataInput
  /** Unique token for the object path (crypto.randomUUID() in the app). */
  token: string
}

/**
 * Upload to project-images under media/<folder>/ and register the asset. The storage object is never overwritten
 * (upsert false, unique path). If registration fails after the upload, the file is left in storage (we never delete
 * from the library) and the error names the path so it can be registered or cleaned up deliberately.
 */
export async function uploadImageAsset(db: Db, input: UploadImageInput): Promise<MediaAsset> {
  const problems = validateMediaMetadata(input.meta)
  if (hasErrors(problems)) throw new MediaValidationError(Object.values(problems)[0] as string)
  const objectPath = buildObjectPath(input.category, input.file.name, input.mime, input.token)
  const bucket = db.storage.from(MEDIA_BUCKET)
  const { error: uploadError } = await bucket.upload(objectPath, input.file, { cacheControl: '31536000', upsert: false, contentType: input.mime })
  if (uploadError) throw new MediaLibraryError(friendlyStorageError(uploadError.message))
  const publicUrl = bucket.getPublicUrl(objectPath).data.publicUrl
  if (!isHttpsUrl(publicUrl)) throw new MediaLibraryError(`The file was uploaded to ${objectPath} but storage did not return a usable HTTPS URL. It was not added to the library.`)
  const row = buildInsertRow({
    meta: input.meta, category: input.category, objectPath, publicUrl, mime: input.mime,
    size: input.file.size, width: input.width, height: input.height, checksum: input.checksum,
  })
  const { data, error } = await db.from('media_assets').insert(row).select(MEDIA_COLUMNS).single()
  if (error || !data) throw new MediaLibraryError(`The file was uploaded (${objectPath}) but could not be added to the library: ${friendlyDbError(error?.message)}`)
  return data as unknown as MediaAsset
}

export interface MediaMetadataPatch { title?: string; category?: ImageCategory; alt_text?: string; is_decorative?: boolean; caption?: string }

/** Only descriptive metadata. The file identity (bucket, path, URL, checksum, size, type) is immutable in the database. */
export async function updateAssetMetadata(db: Db, asset: MediaAsset, patch: MediaMetadataPatch): Promise<MediaAsset> {
  const merged: MediaMetadataInput = {
    title: patch.title ?? asset.title,
    category: patch.category ?? asset.category,
    alt_text: patch.alt_text ?? asset.alt_text,
    is_decorative: patch.is_decorative ?? asset.is_decorative,
    caption: patch.caption ?? asset.caption,
  }
  const problems = validateMediaMetadata(merged, { imageOnly: asset.kind === 'image' })
  if (hasErrors(problems)) throw new MediaValidationError(Object.values(problems)[0] as string)
  const update = {
    title: merged.title.trim(), category: merged.category, is_decorative: merged.is_decorative,
    alt_text: merged.is_decorative ? '' : merged.alt_text.trim(), caption: merged.caption.trim(),
  }
  const { data, error } = await db.from('media_assets').update(update).eq('id', asset.id).select(MEDIA_COLUMNS).single()
  if (error || !data) throw new MediaLibraryError(friendlyDbError(error?.message))
  return data as unknown as MediaAsset
}

async function setStatus(db: Db, id: string, from: MediaStatus, to: MediaStatus): Promise<MediaAsset> {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) throw new MediaLibraryError('Invalid asset id.')
  const { data, error } = await db.from('media_assets').update({ status: to }).eq('id', id).eq('status', from).select(MEDIA_COLUMNS).maybeSingle()
  if (error) throw new MediaLibraryError(friendlyDbError(error.message))
  if (!data) throw new MediaLibraryError(`This asset is no longer ${from}. Reload the library.`)
  return data as unknown as MediaAsset
}

/** Archive = status flag only. The storage object and every existing public reference are untouched. */
export const archiveAsset = (db: Db, id: string) => setStatus(db, id, 'active', 'archived')
export const restoreAsset = (db: Db, id: string) => setStatus(db, id, 'archived', 'active')

export function friendlyStorageError(message?: string): string {
  const text = (message ?? '').toLowerCase()
  if (text.includes('row-level security') || text.includes('unauthorized') || text.includes('not authorized')) return 'Storage refused the upload: your session does not have permission. Sign in again as an admin.'
  if (text.includes('maximum allowed size') || text.includes('too large') || text.includes('payload')) return 'Storage refused the upload because the file is too large for this bucket.'
  if (text.includes('mime') || text.includes('not supported') || text.includes('invalid_mime')) return 'Storage refused this file type for this bucket.'
  if (text.includes('already exists') || text.includes('duplicate')) return 'A file with that storage path already exists. Try the upload again.'
  if (text.includes('fetch') || text.includes('network')) return 'The upload could not reach storage. Check your connection and try again.'
  return `Upload failed: ${message || 'unknown storage error'}.`
}

export function friendlyDbError(message?: string): string {
  const text = (message ?? '').toLowerCase()
  if (text.includes('media_assets') && (text.includes('does not exist') || text.includes('schema cache') || text.includes('could not find'))) return 'The Media Library database table is not installed yet. Run the reviewed media SQL first.'
  if (text.includes('row-level security') || text.includes('permission denied')) return 'The database refused this change: your session is not an active admin.'
  if (text.includes('duplicate key') && text.includes('bucket_path')) return 'This storage file is already registered in the library.'
  if (text.includes('alt_required')) return 'Alt text is required unless the image is marked decorative.'
  if (text.includes('immutable')) return 'The stored file cannot be changed. Upload a new asset instead.'
  return message ? `Database error: ${message}` : 'Something went wrong. Please try again.'
}

// ── usage scan ───────────────────────────────────────────────────────────────────────────────────────────────

export interface MediaUsage { area: string; label: string; field: string; href: string; detail?: string }
export interface MediaUsageScan { usages: MediaUsage[]; unscanned: Array<{ area: string; reason: string }>; scannedAt: string }

interface UsageSource { table: string; area: string; label: (row: Record<string, unknown>) => string; href: (row: Record<string, unknown>) => string }
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : '')

export const USAGE_SOURCES: UsageSource[] = [
  { table: 'blog_posts', area: 'Insights', label: (r) => text(r.title) || text(r.slug) || 'Article', href: (r) => (text(r.id) ? `/admin/blog/edit/${text(r.id)}` : '/admin/blog') },
  { table: 'portfolio_items', area: 'Portfolio', label: (r) => text(r.title) || text(r.slug) || 'Project', href: (r) => (text(r.id) ? `/admin/portfolio/${text(r.id)}` : '/admin/portfolio') },
  { table: 'portfolio_media', area: 'Portfolio creative media', label: (r) => text(r.title) || text(r.alt_text) || 'Creative asset', href: (r) => (text(r.portfolio_id) ? `/admin/portfolio/${text(r.portfolio_id)}` : '/admin/portfolio') },
  { table: 'trust_section', area: 'Trusted Brands', label: () => 'Trusted Brands section', href: () => '/admin/trust' },
  { table: 'hero_section', area: 'Hero', label: () => 'Hero section', href: () => '/admin/hero' },
  { table: 'team_members', area: 'Team', label: (r) => text(r.name) || 'Team member', href: () => '/admin/team' },
  { table: 'about_page', area: 'About page', label: () => 'About page', href: () => '/admin/about' },
  { table: 'testimonials', area: 'Testimonials', label: (r) => text(r.name) || text(r.author) || 'Testimonial', href: () => '/admin/testimonials' },
  { table: 'video_testimonials', area: 'Video proofs', label: (r) => text(r.caption) || text(r.title) || 'Proof', href: () => '/admin/video-testimonials' },
]

const SKIPPED_FIELDS = new Set(['id', 'created_at', 'updated_at'])

/** The strings a stored reference to this asset could contain: its public URL, /bucket/path, or the bare path. */
export function usageNeedles(asset: Pick<MediaAsset, 'public_url' | 'bucket' | 'object_path'>): string[] {
  return [...new Set([asset.public_url, `/${asset.bucket}/${asset.object_path}`, asset.object_path].filter((value) => value.length > 0))]
}

function brandDetail(raw: unknown, asset: MediaAsset, needles: string[]): string | undefined {
  try {
    const items = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(items)) return undefined
    const names = items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .filter((item) => item.asset_id === asset.id || needles.some((needle) => typeof item.logo === 'string' && item.logo.includes(needle)))
      .map((item) => text(item.name) || 'Unnamed brand')
    return names.length ? `Brand: ${names.join(', ')}` : undefined
  } catch { return undefined }
}

/**
 * On-demand usage check across the known reference points. Read-only, no reference tables, no foreign keys.
 * It cannot see references inside external systems or in markup the CMS does not expose, so "not found" means
 * "not found in the places scanned", never "safe to delete" (the library never deletes anyway).
 */
export async function scanAssetUsage(db: Db, asset: MediaAsset): Promise<MediaUsageScan> {
  const needles = usageNeedles(asset)
  const usages: MediaUsage[] = []
  const unscanned: MediaUsageScan['unscanned'] = []
  for (const source of USAGE_SOURCES) {
    try {
      const { data, error } = await db.from(source.table).select('*').limit(2000)
      if (error) { unscanned.push({ area: source.area, reason: error.message || 'Could not be read.' }); continue }
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        for (const [field, value] of Object.entries(row)) {
          if (SKIPPED_FIELDS.has(field) || value == null) continue
          const haystack = typeof value === 'string' ? value : typeof value === 'object' ? JSON.stringify(value) : ''
          if (!haystack || !(needles.some((needle) => haystack.includes(needle)) || (field === 'partner_logos' && haystack.includes(asset.id)))) continue
          usages.push({
            area: source.area, label: source.label(row), field, href: source.href(row),
            detail: field === 'partner_logos' ? brandDetail(value, asset, needles) : undefined,
          })
        }
      }
    } catch (error) {
      unscanned.push({ area: source.area, reason: error instanceof Error ? error.message : 'Could not be read.' })
    }
  }
  // An image can be referenced by id as the poster of a library video (no URL is stored for that link).
  if (asset.kind === 'image') {
    try {
      const { data, error } = await db.from('media_assets').select('id,title,poster_asset_id').eq('poster_asset_id', asset.id).limit(200)
      if (error) unscanned.push({ area: 'Video posters', reason: error.message || 'Could not be read.' })
      else for (const row of (data ?? []) as Array<Record<string, unknown>>) usages.push({ area: 'Video poster', label: text(row.title) || 'Video', field: 'poster_asset_id', href: '/admin/media' })
    } catch (error) {
      unscanned.push({ area: 'Video posters', reason: error instanceof Error ? error.message : 'Could not be read.' })
    }
  }
  return { usages, unscanned, scannedAt: new Date().toISOString() }
}
