import type { SupabaseClient } from '@supabase/supabase-js'
import { looksLikeMarkup, isHttpsUrl, sanitizeFileBase, MediaValidationError } from './media-validation'
import { SITE_MEDIA_BUCKET, MEDIA_COLUMNS, VIDEO_FOLDERS, isVideoCategory, type MediaAsset, type VideoCategory } from './media-types'
import { MediaLibraryError, friendlyDbError, friendlyStorageError } from './media-library'

/**
 * Video support for the Admin Media Library (Batch 3). Short, optimised website video only: this is not a hosting platform
 * and there is no transcoding. Pure validation lives here so it is testable without a browser; the two browser-only pieces
 * (decoding metadata, the resumable upload) take their dependencies as arguments.
 *
 * Storage: the public `site-media` bucket (scripts/admin-media-video-01-forward.sql). Uploads are resumable (TUS) with the
 * signed-in admin's own session token, so storage RLS decides who may write: no service-role key, no new server route.
 * There is deliberately no delete here: archiving is a status flag and files are never removed from storage.
 */

export const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm' } as const
export type VideoMime = keyof typeof VIDEO_TYPES
export const VIDEO_ACCEPT = Object.keys(VIDEO_TYPES).join(',')
const ACCEPTED_EXTENSIONS = ['mp4', 'm4v', 'webm']
const GENERIC_MIME = ['', 'application/octet-stream']

/** Hard limits. The bucket limit (SQL) is set to the same ceiling, below Supabase's 50 MB global cap on the Free plan. */
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024
export const VIDEO_MAX_SECONDS = 180
/** Guidance (warnings, never blockers). */
export const VIDEO_RECOMMENDED_BYTES: Record<VideoCategory, number> = { bgc_video: 8 * 1024 * 1024, video: 25 * 1024 * 1024, ugc_video: 25 * 1024 * 1024 }
export const VIDEO_BGC_RECOMMENDED_SECONDS = 20

export const VIDEO_GUIDANCE =
  'Use an optimised MP4 (H.264) or WebM clip: background video under 8 MB and about 15 seconds, other clips under 25 MB, 1280 × 720 or smaller, no audio for backgrounds. The hard limit is 40 MB.'

/** Identify MP4 / WebM from the first bytes. Names and declared types are never the source of truth. */
export function sniffVideoMime(bytes: Uint8Array): VideoMime | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...Array.from(bytes.slice(start, end)))
  if (bytes.length >= 12 && ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    // ISO base media that is an IMAGE (AVIF/HEIC) or a QuickTime movie is not accepted here.
    if (/^(avif|avis|heic|heix|mif1|msf1|qt  )/.test(brand)) return null
    return 'video/mp4'
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    // EBML header; the DocType must be "webm" (Matroska .mkv is refused).
    return /webm/.test(ascii(0, Math.min(bytes.length, 64))) ? 'video/webm' : null
  }
  return null
}

export interface ValidatedVideo { mime: VideoMime; extension: string; size: number }

export function validateVideoBytes(input: { size: number; declaredType: string; head: Uint8Array; fileName?: string }): ValidatedVideo {
  const { size, declaredType, head } = input
  if (!Number.isFinite(size) || size <= 0) throw new MediaValidationError('This file is empty.')
  if (size > VIDEO_MAX_BYTES) throw new MediaValidationError(`This file is ${(size / 1048576).toFixed(1)} MB. Videos must be ${VIDEO_MAX_BYTES / 1048576} MB or smaller. ${VIDEO_GUIDANCE}`)
  const declared = (declaredType || '').toLowerCase()
  if (declared === 'image/svg+xml' || looksLikeMarkup(head)) throw new MediaValidationError('SVG and other markup files are not accepted. Upload an MP4 or WebM video.')
  const sniffed = sniffVideoMime(head)
  if (!sniffed) throw new MediaValidationError("Upload an MP4 or WebM video. This file's contents are not a supported video (QuickTime .mov, .mkv and other formats are not accepted).")
  if (!GENERIC_MIME.includes(declared) && declared !== sniffed) throw new MediaValidationError(`The file says it is ${declared} but its contents are ${sniffed}. Re-export it and try again.`)
  const extension = (String(input.fileName ?? '').split(/[\\/]/).pop() ?? '').match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase()
  if (extension && !ACCEPTED_EXTENSIONS.includes(extension)) throw new MediaValidationError(`The file name ends in .${extension}, which is not an MP4 or WebM video.`)
  return { mime: sniffed, extension: VIDEO_TYPES[sniffed], size }
}

export interface VideoMetadataInput { title: string; category: string; caption: string }
export type VideoMetadataErrors = Partial<Record<keyof VideoMetadataInput | 'poster', string>>

/** Title and category are required. A background video needs a poster (it is what reduced-motion and mobile visitors see). */
export function validateVideoMetadata(input: VideoMetadataInput, options: { hasPoster: boolean }): VideoMetadataErrors {
  const errors: VideoMetadataErrors = {}
  const title = input.title.trim()
  if (!title) errors.title = 'Give the video a name so it can be found later.'
  else if (title.length > 160) errors.title = 'Keep the name to 160 characters or fewer.'
  if (!isVideoCategory(input.category)) errors.category = 'Choose a video category.'
  if (input.caption.length > 1000) errors.caption = 'Keep the caption to 1000 characters or fewer.'
  if (input.category === 'bgc_video' && !options.hasPoster) errors.poster = 'A background video needs a poster image: it is what visitors see on mobile and with reduced motion.'
  return errors
}

export interface VideoTechnicalInfo { size: number; duration: number | null; width: number | null; height: number | null }

/** Non-blocking advice shown beside the file details. */
export function videoWarnings(category: string, info: VideoTechnicalInfo, hasPoster: boolean): string[] {
  const warnings: string[] = []
  const cat: VideoCategory = isVideoCategory(category) ? category : 'video'
  if (info.size > VIDEO_RECOMMENDED_BYTES[cat]) warnings.push(`This file is ${(info.size / 1048576).toFixed(1)} MB; ${cat === 'bgc_video' ? 'background video' : 'website video'} works best under ${VIDEO_RECOMMENDED_BYTES[cat] / 1048576} MB.`)
  if (cat === 'bgc_video' && info.duration !== null && info.duration > VIDEO_BGC_RECOMMENDED_SECONDS) warnings.push(`A background loop works best at about ${VIDEO_BGC_RECOMMENDED_SECONDS} seconds or less (this is ${Math.round(info.duration)} s).`)
  if (info.width !== null && info.height !== null && Math.max(info.width, info.height) > 1920) warnings.push(`${info.width} × ${info.height} is larger than needed. 1280 × 720 is plenty for the web.`)
  if (!hasPoster && cat !== 'bgc_video') warnings.push('Add a poster image so the video has a preview before it plays.')
  return warnings
}

const TOKEN = /^[0-9a-f-]{8,36}$/i

/** media/<folder>/<base>-<token>.<ext> inside site-media. The extension comes from the sniffed type, not the file name. */
export function buildVideoObjectPath(category: VideoCategory, fileName: string, mime: VideoMime, token: string): string {
  if (!isVideoCategory(category)) throw new MediaValidationError('Choose a valid video category.')
  if (!TOKEN.test(token)) throw new MediaValidationError('Invalid upload token.')
  return `${VIDEO_FOLDERS[category]}/${sanitizeFileBase(fileName, 'video')}-${token.toLowerCase()}.${VIDEO_TYPES[mime]}`
}

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

export function buildVideoInsertRow(input: {
  meta: VideoMetadataInput; category: VideoCategory; objectPath: string; publicUrl: string; mime: VideoMime; size: number
  width: number | null; height: number | null; duration: number | null; checksum: string | null; posterAssetId: string | null
}) {
  const sized = input.width !== null && input.height !== null && input.width >= 1 && input.height >= 1 && input.width <= 20000 && input.height <= 20000
  return {
    kind: 'video' as const,
    category: input.category,
    title: input.meta.title.trim(),
    alt_text: '',
    is_decorative: false,
    caption: input.meta.caption.trim(),
    bucket: SITE_MEDIA_BUCKET,
    object_path: input.objectPath,
    public_url: input.publicUrl,
    mime_type: input.mime,
    size_bytes: input.size,
    width: sized ? Math.round(input.width as number) : null,
    height: sized ? Math.round(input.height as number) : null,
    duration_seconds: input.duration !== null && Number.isFinite(input.duration) && input.duration >= 0 ? Math.round(input.duration * 100) / 100 : null,
    poster_asset_id: input.posterAssetId && UUID.test(input.posterAssetId) ? input.posterAssetId : null,
    checksum: input.checksum,
    status: 'active' as const,
  }
}

/* ── Browser-only ─────────────────────────────────────────────────────── */

/** Decode the container in a <video> element: confirms the browser can actually play it and reads duration and size. */
export function readVideoMetadata(file: Blob): Promise<{ duration: number | null; width: number | null; height: number | null }> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') { reject(new MediaValidationError('This browser cannot read the video.')); return }
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = () => { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url) }
    const timer = window.setTimeout(() => { done(); reject(new MediaValidationError('The video took too long to open. It may be corrupted or use a codec this browser cannot play.')) }, 15000)
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => {
      window.clearTimeout(timer)
      const duration = Number.isFinite(video.duration) ? video.duration : null
      const width = video.videoWidth || null
      const height = video.videoHeight || null
      done()
      if (duration !== null && duration > VIDEO_MAX_SECONDS) { reject(new MediaValidationError(`This video is ${Math.round(duration)} seconds long. Clips must be ${VIDEO_MAX_SECONDS} seconds or shorter.`)); return }
      resolve({ duration, width, height })
    }
    video.onerror = () => { window.clearTimeout(timer); done(); reject(new MediaValidationError('This video could not be played. It may be corrupted, or use a codec this browser does not support. Re-export it as H.264 MP4 or WebM.')) }
    video.src = url
  })
}

type Db = Pick<SupabaseClient, 'from' | 'storage' | 'auth'>

/** Minimal shape of tus-js-client's Upload, so tests can inject a fake and the library loads only when an upload starts. */
export interface TusLike { start(): void; abort(terminate?: boolean): Promise<void> | void }
export interface TusFactoryOptions {
  endpoint: string; headers: Record<string, string>; chunkSize: number; retryDelays: number[]
  metadata: Record<string, string>; onProgress: (sent: number, total: number) => void; onError: (error: Error) => void; onSuccess: () => void
}
export interface VideoUploadDeps { endpoint?: string; createUpload?: (file: File, options: TusFactoryOptions) => Promise<TusLike> | TusLike }

/** Supabase's TUS endpoint requires 6 MB chunks. */
export const TUS_CHUNK_SIZE = 6 * 1024 * 1024
const RETRY_DELAYS = [0, 3000, 5000, 10000, 20000]

export interface VideoUploadInput { file: File; mime: VideoMime; category: VideoCategory; token: string; onProgress?: (fraction: number) => void }
export interface VideoUploadHandle { objectPath: string; promise: Promise<void>; cancel: () => void }

/**
 * Resumable upload of the file bytes to site-media. Never overwrites (x-upsert false, unique path). Registering the asset is a
 * separate step so a failed registration can be retried without uploading the file again.
 */
export function startVideoUpload(db: Db, input: VideoUploadInput, deps: VideoUploadDeps = {}): VideoUploadHandle {
  const objectPath = buildVideoObjectPath(input.category, input.file.name, input.mime, input.token)
  let upload: TusLike | null = null
  let cancelled = false
  const promise = (async () => {
    const { data, error } = await db.auth.getSession()
    const token = data?.session?.access_token
    if (error || !token) throw new MediaLibraryError('Your session has expired. Sign in again, then retry the upload.')
    const base = deps.endpoint ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/upload/resumable`
    if (!/^https:\/\//.test(base)) throw new MediaLibraryError('Storage is not configured for uploads.')
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (cancelled) throw new MediaLibraryError('Upload cancelled.')
    await new Promise<void>((resolve, reject) => {
      const options: TusFactoryOptions = {
        endpoint: base,
        headers: { authorization: `Bearer ${token}`, 'x-upsert': 'false', ...(anon ? { apikey: anon } : {}) },
        chunkSize: TUS_CHUNK_SIZE,
        retryDelays: RETRY_DELAYS,
        metadata: { bucketName: SITE_MEDIA_BUCKET, objectName: objectPath, contentType: input.mime, cacheControl: '31536000' },
        onProgress: (sent, total) => input.onProgress?.(total > 0 ? Math.min(1, sent / total) : 0),
        onError: (failure) => reject(cancelled ? new MediaLibraryError('Upload cancelled.') : new MediaLibraryError(friendlyStorageError(failure.message))),
        onSuccess: () => resolve(),
      }
      Promise.resolve(deps.createUpload ? deps.createUpload(input.file, options) : defaultCreateUpload(input.file, options)).then((created) => {
        upload = created
        if (cancelled) { reject(new MediaLibraryError('Upload cancelled.')); return }
        created.start()
      }, reject)
    })
  })()
  return { objectPath, promise, cancel: () => { cancelled = true; void upload?.abort(true) } }
}

async function defaultCreateUpload(file: File, options: TusFactoryOptions): Promise<TusLike> {
  const tus = await import('tus-js-client')
  return new tus.Upload(file, {
    endpoint: options.endpoint, headers: options.headers, chunkSize: options.chunkSize, retryDelays: options.retryDelays,
    uploadDataDuringCreation: true, removeFingerprintOnSuccess: true, metadata: options.metadata,
    onProgress: options.onProgress, onError: options.onError, onSuccess: options.onSuccess,
  }) as unknown as TusLike
}

export interface RegisterVideoInput {
  objectPath: string; mime: VideoMime; category: VideoCategory; size: number; meta: VideoMetadataInput
  width: number | null; height: number | null; duration: number | null; checksum: string | null; posterAssetId: string | null
}

/** A poster must be an active IMAGE asset (the database only guarantees that it is some media asset). */
export async function assertPosterAsset(db: Pick<SupabaseClient, 'from'>, id: string): Promise<void> {
  if (!UUID.test(id)) throw new MediaLibraryError('Invalid poster.')
  const [poster] = await getAssetsByIds(db, [id])
  if (!poster || poster.kind !== 'image') throw new MediaLibraryError('The poster must be an image from the Media Library.')
  if (poster.status !== 'active') throw new MediaLibraryError('That poster image is archived. Restore it or choose another.')
}

/** Insert the media_assets row for a file that is already in site-media. Never deletes anything on failure. */
export async function registerVideoAsset(db: Db, input: RegisterVideoInput): Promise<MediaAsset> {
  const problems = validateVideoMetadata(input.meta, { hasPoster: !!input.posterAssetId })
  const first = Object.values(problems)[0]
  if (first) throw new MediaValidationError(first)
  if (input.posterAssetId) await assertPosterAsset(db, input.posterAssetId)
  const publicUrl = db.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(input.objectPath).data.publicUrl
  if (!isHttpsUrl(publicUrl)) throw new MediaLibraryError(`The video is in storage (${input.objectPath}) but no usable HTTPS URL was returned.`)
  const row = buildVideoInsertRow({ ...input, publicUrl })
  const { data, error } = await db.from('media_assets').insert(row).select(MEDIA_COLUMNS).single()
  if (error || !data) throw new MediaLibraryError(`The video uploaded (${input.objectPath}) but could not be added to the library: ${friendlyDbError(error?.message)}`)
  return data as unknown as MediaAsset
}

export interface VideoMetadataPatch { title?: string; category?: VideoCategory; caption?: string; poster_asset_id?: string | null }

/** Descriptive fields and the poster only. File identity stays immutable (database trigger). */
export async function updateVideoMetadata(db: Pick<SupabaseClient, 'from'>, asset: MediaAsset, patch: VideoMetadataPatch): Promise<MediaAsset> {
  if (asset.kind !== 'video') throw new MediaLibraryError('This is not a video asset.')
  const poster = patch.poster_asset_id === undefined ? asset.poster_asset_id : patch.poster_asset_id
  if (poster !== null && !UUID.test(poster)) throw new MediaLibraryError('Invalid poster.')
  if (poster === asset.id) throw new MediaLibraryError('A video cannot be its own poster.')
  const meta = { title: patch.title ?? asset.title, category: patch.category ?? asset.category, caption: patch.caption ?? asset.caption }
  const problems = validateVideoMetadata(meta, { hasPoster: poster !== null })
  const first = Object.values(problems)[0]
  if (first) throw new MediaValidationError(first)
  if (poster !== null && poster !== asset.poster_asset_id) await assertPosterAsset(db, poster)
  const { data, error } = await db.from('media_assets')
    .update({ title: meta.title.trim(), category: meta.category, caption: meta.caption.trim(), poster_asset_id: poster })
    .eq('id', asset.id).select(MEDIA_COLUMNS).single()
  if (error || !data) throw new MediaLibraryError(friendlyDbError(error?.message))
  return data as unknown as MediaAsset
}

/** Posters (and any other asset lookups by id) for display. Missing ids are simply absent from the result. */
export async function getAssetsByIds(db: Pick<SupabaseClient, 'from'>, ids: string[]): Promise<MediaAsset[]> {
  const valid = [...new Set(ids.filter((id) => UUID.test(id)))].slice(0, 100)
  if (!valid.length) return []
  const { data, error } = await db.from('media_assets').select(MEDIA_COLUMNS).in('id', valid)
  if (error) throw new MediaLibraryError(friendlyDbError(error.message))
  return (data ?? []) as unknown as MediaAsset[]
}
