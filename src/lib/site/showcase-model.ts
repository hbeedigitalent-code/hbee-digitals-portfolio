/**
 * Public showcase items: the pure mapping from get_media_showcase() rows. Only switched-on placements ever reach it. A row
 * that cannot be shown safely (no HTTPS file, no label, unknown type) is dropped rather than rendered half-broken.
 */
import { displayLabel } from '@/lib/media/display-types'

export interface ShowcaseItem {
  id: string
  kind: 'image' | 'video'
  url: string
  mimeType: string
  width: number | null
  height: number | null
  alt: string
  posterUrl: string | null
  label: string
  title: string
  caption: string
  project: { href: string; name: string } | null
}

const https = (value: unknown): value is string => {
  if (typeof value !== 'string' || /[\s<>"'\\]/.test(value)) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const dimension = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null)

export function toShowcaseItems(rows: unknown): ShowcaseItem[] {
  if (!Array.isArray(rows)) return []
  const items: ShowcaseItem[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const kind = row.kind === 'image' || row.kind === 'video' ? row.kind : null
    const label = displayLabel(text(row.display_type), text(row.custom_label))
    const mimeType = text(row.mime_type)
    if (!kind || !label || !https(row.url) || !text(row.placement_id)) continue
    if (kind === 'video' && mimeType !== 'video/mp4' && mimeType !== 'video/webm') continue
    const title = text(row.title)
    const slug = text(row.project_slug)
    items.push({
      id: text(row.placement_id), kind, url: row.url as string, mimeType,
      width: dimension(row.width), height: dimension(row.height),
      // These images are content, so there is always a text alternative: the library alt text, else what the card says.
      alt: text(row.alt_text) || [label, title].filter(Boolean).join(': '),
      posterUrl: https(row.poster_url) ? (row.poster_url as string) : null,
      label, title, caption: text(row.caption),
      project: /^[a-z0-9][a-z0-9-]*$/i.test(slug) ? { href: `/work/${slug}`, name: text(row.project_name) || 'the project' } : null,
    })
  }
  return items
}

/**
 * The frame keeps the media's own proportions, limited so a very wide wordmark or a very tall story does not break the
 * grid. Inside the frame the file is always contained: never stretched, never cropped.
 */
export function frameRatio(item: Pick<ShowcaseItem, 'width' | 'height' | 'kind'>): number {
  const natural = item.width && item.height ? item.width / item.height : item.kind === 'video' ? 16 / 9 : 1
  return Math.min(16 / 9, Math.max(9 / 16, natural))
}
