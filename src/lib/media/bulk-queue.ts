import type { SupabaseClient } from '@supabase/supabase-js'
import { sha256Hex } from './media-checksum'
import { registerStoredImage, uploadImageAsset } from './media-library'
import { prepareImageFile } from './media-prepare'
import { defaultTitleFromFileName, validateMediaMetadata, type MediaImageMime } from './media-validation'
import {
  readVideoMetadata, registerVideoAsset, sniffVideoMime, startVideoUpload, validateVideoBytes, validateVideoMetadata,
  type VideoMime, type VideoUploadDeps, type VideoUploadHandle,
} from './media-video'
import { isImageCategory, isVideoCategory, type ImageCategory, type MediaAsset, type MediaKind, type VideoCategory } from './media-types'

/**
 * The multi-file upload queue (images and video together). Every file is checked, described and uploaded on its own:
 * one bad, duplicate or failed file never blocks or rolls back another. All validation is the same code the single-file
 * upload uses.
 */

/**
 * Limits for one selection. A browser tab holds a preview for every queued file and reads one whole file at a time to hash
 * it; 20 files (and 300 MB in total) keeps that comfortable. These are interface limits, not database constraints.
 */
export const BULK_MAX_FILES = 20
export const BULK_MAX_TOTAL_BYTES = 300 * 1024 * 1024

export type QueuePhase = 'checking' | 'idle' | 'uploading' | 'saving' | 'uploaded' | 'existing' | 'failed' | 'cancelled'
export type QueueState = Exclude<QueuePhase, 'idle'> | 'ready' | 'attention' | 'duplicate'

export interface PreparedQueueFile { mime: string; size: number; width: number | null; height: number | null; duration: number | null; checksum: string | null }

export interface QueueItem {
  key: string
  file: File
  /** The file as picked, so an edit or batch trim can be undone. */
  original: File
  kind: MediaKind
  phase: QueuePhase
  prepared: PreparedQueueFile | null
  /** Why the file itself cannot be uploaded (type, size, unreadable). */
  invalid: string
  title: string
  category: ImageCategory | VideoCategory
  altText: string
  decorative: boolean
  caption: string
  poster: MediaAsset | null
  /** Library assets with the same bytes. */
  duplicates: MediaAsset[]
  /** Same bytes as an earlier file in this queue. */
  sameAsEarlier: boolean
  allowDuplicate: boolean
  /** 0..1 for video; null where the transport reports no byte progress (images). */
  progress: number | null
  error: string
  storedPath: string
  asset: MediaAsset | null
}

export interface BatchDefaults { image: ImageCategory; video: VideoCategory }

/** Which validator a file goes to. Bytes decide when they can; the validator still has the final say. */
export function guessKind(file: { type: string; name: string }, head?: Uint8Array): MediaKind {
  if (head && sniffVideoMime(head)) return 'video'
  if ((file.type || '').toLowerCase().startsWith('video/') || /\.(mp4|m4v|webm|mov|mkv|avi)$/i.test(file.name)) return 'video'
  return 'image'
}

export function newQueueItem(file: File, key: string, kind: MediaKind, defaults: BatchDefaults): QueueItem {
  return {
    key, file, original: file, kind, phase: 'checking', prepared: null, invalid: '',
    title: defaultTitleFromFileName(file.name), category: kind === 'video' ? defaults.video : defaults.image,
    altText: '', decorative: false, caption: '', poster: null,
    duplicates: [], sameAsEarlier: false, allowDuplicate: false, progress: null, error: '', storedPath: '', asset: null,
  }
}

const FINISHED: QueuePhase[] = ['uploaded', 'existing']
export const isFinished = (item: QueueItem) => FINISHED.includes(item.phase)

/** How many of a new selection fit, and why the rest were left out. */
export function acceptFiles<T extends { name: string; size: number }>(queued: Array<Pick<QueueItem, 'file' | 'phase'>>, files: T[]): { accepted: T[]; rejected: string[] } {
  const open = queued.filter((item) => !FINISHED.includes(item.phase))
  let count = open.length
  let bytes = open.reduce((sum, item) => sum + item.file.size, 0)
  const accepted: T[] = []
  const rejected: string[] = []
  for (const file of files) {
    if (count >= BULK_MAX_FILES) { rejected.push(`“${file.name}” was not added: a batch holds up to ${BULK_MAX_FILES} files.`); continue }
    if (bytes + file.size > BULK_MAX_TOTAL_BYTES) { rejected.push(`“${file.name}” was not added: a batch holds up to ${BULK_MAX_TOTAL_BYTES / 1048576} MB.`); continue }
    accepted.push(file); count += 1; bytes += file.size
  }
  return { accepted, rejected }
}

export interface PrepareQueueDeps {
  readDimensions?: (file: Blob) => Promise<{ width: number; height: number }>
  readVideo?: (file: Blob) => Promise<{ duration: number | null; width: number | null; height: number | null }>
}

/** Validate one file exactly as the single-file uploaders do. Throws with a readable message. */
export async function prepareQueueFile(file: File, kind: MediaKind, deps: PrepareQueueDeps = {}): Promise<PreparedQueueFile> {
  if (kind === 'image') {
    const image = await prepareImageFile(file, deps.readDimensions ? { readDimensions: deps.readDimensions } : {})
    return { mime: image.mime, size: image.size, width: image.width, height: image.height, duration: null, checksum: image.checksum }
  }
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  const video = validateVideoBytes({ size: file.size, declaredType: file.type, head, fileName: file.name })
  const decoded = await (deps.readVideo ?? readVideoMetadata)(file)
  return { mime: video.mime, size: video.size, ...decoded, checksum: await sha256Hex(await file.arrayBuffer()) }
}

/** What the owner still has to fill in. Alt text is never invented. */
export function metadataProblems(item: QueueItem): string[] {
  if (item.kind === 'image') {
    return Object.values(validateMediaMetadata({ title: item.title, category: item.category, alt_text: item.altText, is_decorative: item.decorative, caption: item.caption })) as string[]
  }
  return Object.values(validateVideoMetadata({ title: item.title, category: item.category, caption: item.caption }, { hasPoster: !!item.poster })) as string[]
}

export const isUnresolvedDuplicate = (item: QueueItem) => (item.duplicates.length > 0 || item.sameAsEarlier) && !item.allowDuplicate

export function queueState(item: QueueItem): QueueState {
  if (item.phase !== 'idle') return item.phase
  if (item.invalid) return 'attention'
  if (isUnresolvedDuplicate(item)) return 'duplicate'
  return metadataProblems(item).length ? 'attention' : 'ready'
}

/** Flag files whose bytes repeat an earlier, still-queued file. */
export function markRepeats(items: QueueItem[]): QueueItem[] {
  const seen = new Set<string>()
  return items.map((item) => {
    const checksum = item.prepared?.checksum
    if (!checksum || item.phase === 'cancelled') return item.sameAsEarlier ? { ...item, sameAsEarlier: false } : item
    const repeat = seen.has(checksum) && !isFinished(item)
    seen.add(checksum)
    return item.sameAsEarlier === repeat ? item : { ...item, sameAsEarlier: repeat }
  })
}

/** Once a file is in the library, later queued files with the same bytes can use that asset instead of uploading again. */
export function offerAssetToRepeats(items: QueueItem[], asset: MediaAsset): QueueItem[] {
  if (!asset.checksum) return items
  return items.map((item) => (!isFinished(item) && item.prepared?.checksum === asset.checksum && !item.duplicates.some((other) => other.id === asset.id)
    ? { ...item, duplicates: [...item.duplicates, asset] } : item))
}

/** Batch default: set the category on every unfinished file of that kind. Each file can still be changed afterwards. */
export function applyCategory(items: QueueItem[], kind: MediaKind, category: string): QueueItem[] {
  if (kind === 'image' ? !isImageCategory(category) : !isVideoCategory(category)) return items
  return items.map((item) => (item.kind === kind && !isFinished(item) && !item.storedPath && !['uploading', 'saving'].includes(item.phase)
    ? { ...item, category: category as QueueItem['category'] } : item))
}

export function queueSummary(items: QueueItem[]) {
  const states = items.map(queueState)
  const count = (state: QueueState) => states.filter((value) => value === state).length
  return {
    total: items.length, ready: count('ready'), attention: count('attention'), duplicate: count('duplicate'),
    uploaded: count('uploaded') + count('existing'), failed: count('failed'), cancelled: count('cancelled'),
    active: count('uploading') + count('saving'), checking: count('checking'),
  }
}

type Db = Pick<SupabaseClient, 'from' | 'storage' | 'auth'>

export interface UploadQueueDeps {
  token: () => string
  video?: VideoUploadDeps
  /** Receives the handle of an in-flight video upload so it can be cancelled. */
  onHandle?: (handle: VideoUploadHandle | null) => void
}

/**
 * Upload and register ONE file. If the bytes are already stored (a previous registration failed), only the registration is
 * retried. Errors carry `storedPath` when a file was left in storage; nothing is ever deleted.
 */
export async function uploadQueueItem(db: Db, item: QueueItem, onChange: (patch: Partial<QueueItem>) => void, deps: UploadQueueDeps): Promise<MediaAsset> {
  const prepared = item.prepared
  if (!prepared || item.invalid) throw new Error(item.invalid || 'This file has not been checked yet.')
  const problem = metadataProblems(item)[0]
  if (problem) throw new Error(problem)
  if (item.kind === 'image') {
    const input = {
      file: item.file, mime: prepared.mime as MediaImageMime, width: prepared.width as number, height: prepared.height as number, checksum: prepared.checksum,
      category: item.category as ImageCategory, token: deps.token(),
      meta: { title: item.title, category: item.category, alt_text: item.altText, is_decorative: item.decorative, caption: item.caption },
    }
    onChange({ phase: item.storedPath ? 'saving' : 'uploading', progress: null, error: '' })
    return item.storedPath ? registerStoredImage(db, input, item.storedPath) : uploadImageAsset(db, input)
  }
  let objectPath = item.storedPath
  if (!objectPath) {
    onChange({ phase: 'uploading', progress: 0, error: '' })
    const handle = startVideoUpload(db, { file: item.file, mime: prepared.mime as VideoMime, category: item.category as VideoCategory, token: deps.token(), onProgress: (progress) => onChange({ progress }) }, deps.video)
    deps.onHandle?.(handle)
    try { await handle.promise } finally { deps.onHandle?.(null) }
    objectPath = handle.objectPath
    onChange({ storedPath: objectPath })
  }
  onChange({ phase: 'saving', error: '' })
  return registerVideoAsset(db, {
    objectPath, mime: prepared.mime as VideoMime, category: item.category as VideoCategory, size: prepared.size,
    meta: { title: item.title, category: item.category, caption: item.caption },
    width: prepared.width, height: prepared.height, duration: prepared.duration, checksum: prepared.checksum, posterAssetId: item.poster?.id ?? null,
  })
}

/**
 * Upload the given files one after another. Each outcome is recorded on its own item; a failure is never allowed to stop or
 * undo the rest. `get` returns the latest version of an item (the owner may cancel one while others upload).
 */
export async function runQueue(
  db: Db, keys: string[], get: (key: string) => QueueItem | undefined, update: (key: string, patch: Partial<QueueItem>) => void, deps: UploadQueueDeps,
): Promise<MediaAsset[]> {
  const uploaded: MediaAsset[] = []
  for (const key of keys) {
    const item = get(key)
    if (!item || (queueState(item) !== 'ready' && item.phase !== 'failed')) continue
    try {
      const asset = await uploadQueueItem(db, item, (patch) => update(key, patch), deps)
      uploaded.push(asset)
      update(key, { phase: 'uploaded', asset, progress: 1, error: '' })
    } catch (error) {
      const message = String((error as { message?: unknown })?.message || 'Upload failed.')
      const storedPath = (error as { storedPath?: string })?.storedPath
      const cancelled = get(key)?.phase === 'cancelled' || /cancelled/i.test(message)
      update(key, { phase: cancelled ? 'cancelled' : 'failed', error: cancelled ? '' : message, progress: null, ...(storedPath ? { storedPath } : {}) })
    }
  }
  return uploaded
}
