/**
 * Admin Media Library domain types. Pure: safe in the browser, server and tests.
 * Mirrors the CHECK constraints in scripts/admin-media-01-forward.sql.
 */
export const MEDIA_CATEGORIES = ['brand_logo', 'graphic', 'insight_image', 'project_image', 'general', 'video', 'bgc_video', 'ugc_video'] as const
export type MediaCategory = (typeof MEDIA_CATEGORIES)[number]

/** Batch 1 uploads images only. The video categories exist so the registry stays extensible (Batch 3). */
export const IMAGE_CATEGORIES = ['brand_logo', 'graphic', 'insight_image', 'project_image', 'general'] as const satisfies readonly MediaCategory[]
export type ImageCategory = (typeof IMAGE_CATEGORIES)[number]
export const VIDEO_CATEGORIES = ['video', 'bgc_video', 'ugc_video'] as const satisfies readonly MediaCategory[]

export const MEDIA_KINDS = ['image', 'video'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]
export const MEDIA_STATUSES = ['active', 'archived'] as const
export type MediaStatus = (typeof MEDIA_STATUSES)[number]

export const CATEGORY_LABELS: Record<MediaCategory, string> = {
  brand_logo: 'Brand logo',
  graphic: 'Graphic / campaign creative',
  insight_image: 'Insights image',
  project_image: 'Project image',
  general: 'General website image',
  video: 'Video',
  bgc_video: 'Background video',
  ugc_video: 'UGC / creative video',
}

/** Folder under media/ used for NEW uploads in the reused project-images bucket. */
export const CATEGORY_FOLDERS: Record<ImageCategory, string> = {
  brand_logo: 'brand-logos',
  graphic: 'graphics',
  insight_image: 'insight-images',
  project_image: 'project-images',
  general: 'general',
}

export const MEDIA_BUCKET = 'project-images'

/** Public bucket for website video (Batch 3). Images stay in MEDIA_BUCKET. Created by scripts/admin-media-video-01-forward.sql. */
export const SITE_MEDIA_BUCKET = 'site-media'
export type VideoCategory = (typeof VIDEO_CATEGORIES)[number]
/** Folder under the site-media bucket for NEW video uploads. */
export const VIDEO_FOLDERS: Record<VideoCategory, string> = {
  video: 'videos',
  bgc_video: 'background',
  ugc_video: 'ugc',
}

export interface MediaAsset {
  id: string
  kind: MediaKind
  category: MediaCategory
  title: string
  alt_text: string
  is_decorative: boolean
  caption: string
  bucket: string
  object_path: string
  public_url: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  duration_seconds: number | null
  poster_asset_id: string | null
  checksum: string | null
  status: MediaStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Columns read by the library. Explicit (never select *) so a future column cannot leak into pickers. */
export const MEDIA_COLUMNS =
  'id,kind,category,title,alt_text,is_decorative,caption,bucket,object_path,public_url,mime_type,size_bytes,width,height,duration_seconds,poster_asset_id,checksum,status,created_by,created_at,updated_at'

export const isMediaCategory = (value: unknown): value is MediaCategory =>
  typeof value === 'string' && (MEDIA_CATEGORIES as readonly string[]).includes(value)
export const isVideoCategory = (value: unknown): value is VideoCategory =>
  typeof value === 'string' && (VIDEO_CATEGORIES as readonly string[]).includes(value)
export const isImageCategory = (value: unknown): value is ImageCategory =>
  typeof value === 'string' && (IMAGE_CATEGORIES as readonly string[]).includes(value)
export const isMediaKind = (value: unknown): value is MediaKind =>
  typeof value === 'string' && (MEDIA_KINDS as readonly string[]).includes(value)
export const isMediaStatus = (value: unknown): value is MediaStatus =>
  typeof value === 'string' && (MEDIA_STATUSES as readonly string[]).includes(value)

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
