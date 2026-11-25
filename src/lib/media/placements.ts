import type { SupabaseClient } from '@supabase/supabase-js'
import { CAPABILITY_SLUGS, isCapabilitySlug, type CapabilitySlug } from '@/lib/portfolio-creative'
import { getAssetsByIds } from './media-video'
import { MediaLibraryError } from './media-library'
import type { MediaAsset, MediaKind } from './media-types'
import { CUSTOM_LABEL_MAX, DISPLAY_TYPES, SERVICE_NAMES, allowsKind, displayLabel, displayTypesFor, isDisplayType, type DisplayType } from './display-types'

/**
 * Reusable media placements (scripts/admin-media-placement-01-forward.sql).
 *
 * Upload once, place many times. The Media Library CATEGORY says what a file is; a PLACEMENT says where it appears and how
 * it is presented there (editorial label, title, caption, order, on/off, optional related project). The file is never
 * copied. Nothing is ever shown because of its category: only an explicit, switched-on placement renders publicly.
 * Removing a placement removes only the reference: never the asset, never the stored file.
 */

/* ── Editorial display labels live in display-types.ts (also used by the public site) ── */

export { CUSTOM_LABEL_MAX, DISPLAY_TYPES, displayLabel, displayTypesFor, isDisplayType, type DisplayType }

/* ── Targets and slots ─────────────────────────────────────────────────────────────────── */

export type PlacementTargetType = 'site' | 'service' | 'project'
export type PlacementSlot = 'creative_showcase' | 'showcase' | 'project_media'
export interface PlacementTarget { type: PlacementTargetType; key: string; slot: PlacementSlot }

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

export const WORK_SHOWCASE: PlacementTarget = { type: 'site', key: 'work', slot: 'creative_showcase' }
export const serviceShowcase = (slug: CapabilitySlug): PlacementTarget => ({ type: 'service', key: slug, slot: 'showcase' })
export const projectMedia = (portfolioId: string): PlacementTarget => ({ type: 'project', key: portfolioId.toLowerCase(), slot: 'project_media' })

export function isValidTarget(target: PlacementTarget): boolean {
  if (target.type === 'site') return target.key === 'work' && target.slot === 'creative_showcase'
  if (target.type === 'service') return isCapabilitySlug(target.key) && target.slot === 'showcase'
  return target.type === 'project' && UUID.test(target.key) && target.slot === 'project_media'
}

export { CAPABILITY_SLUGS, SERVICE_NAMES }

/** Every showcase accepts images and foreground video. Background (decorative) video is never showcase content. */
export function placementBlocker(asset: Pick<MediaAsset, 'kind' | 'category'>): string | undefined {
  if (asset.kind === 'video' && asset.category === 'bgc_video') return 'Background video is decorative and cannot be placed in a showcase.'
  if (asset.kind !== 'image' && asset.kind !== 'video') return 'This asset type cannot be placed.'
}

/** A neutral starting label. New placements are created switched OFF so the label is reviewed before anything is public. */
export function suggestedDisplayType(asset: Pick<MediaAsset, 'kind' | 'category'>): DisplayType {
  if (asset.kind === 'video') return asset.category === 'ugc_video' ? 'ugc_video' : 'project_video'
  if (asset.category === 'brand_logo') return 'brand_asset'
  if (asset.category === 'project_image') return 'website_creative'
  return 'campaign_creative'
}

/* ── Records ───────────────────────────────────────────────────────────────────────────── */

export interface MediaPlacement {
  id: string
  media_asset_id: string
  target_type: PlacementTargetType
  target_key: string
  slot: PlacementSlot
  display_type: DisplayType
  custom_label: string
  title_override: string
  caption_override: string
  related_project_id: string | null
  display_order: number
  is_active: boolean
}
export interface PlacementWithAsset extends MediaPlacement { asset: MediaAsset | null }

export const PLACEMENT_COLUMNS = 'id,media_asset_id,target_type,target_key,slot,display_type,custom_label,title_override,caption_override,related_project_id,display_order,is_active'

export type PlacementEdit = Pick<MediaPlacement, 'display_type' | 'custom_label' | 'title_override' | 'caption_override' | 'related_project_id' | 'is_active'>

export function validatePlacement(edit: PlacementEdit, kind: MediaKind, target: PlacementTarget): string | undefined {
  if (!isDisplayType(edit.display_type)) return 'Choose a display label.'
  if (!allowsKind(edit.display_type, kind)) return `“${DISPLAY_TYPES[edit.display_type].label}” cannot describe ${kind === 'video' ? 'a video' : 'an image'}.`
  const custom = edit.custom_label.trim()
  if (edit.display_type === 'other' && !custom) return 'Write the custom label, or choose one from the list.'
  if (custom.length > CUSTOM_LABEL_MAX) return `Keep the custom label to ${CUSTOM_LABEL_MAX} characters or fewer.`
  if (edit.title_override.length > 160) return 'Keep the title to 160 characters or fewer.'
  if (edit.caption_override.length > 600) return 'Keep the caption to 600 characters or fewer.'
  if (edit.related_project_id !== null && (target.type === 'project' || !UUID.test(edit.related_project_id))) return 'Choose a valid related project.'
}

export function buildPlacementRow(asset: Pick<MediaAsset, 'id' | 'kind' | 'category'>, target: PlacementTarget, order: number) {
  if (!isValidTarget(target)) throw new MediaLibraryError('Unknown placement target.')
  const blocked = placementBlocker(asset)
  if (blocked) throw new MediaLibraryError(blocked)
  return {
    media_asset_id: asset.id, target_type: target.type, target_key: target.key, slot: target.slot,
    display_type: suggestedDisplayType(asset), custom_label: '', title_override: '', caption_override: '', related_project_id: null,
    display_order: order, is_active: false,
  }
}

/* ── Admin data layer (browser session client; RLS = active admin) ─────────────────────── */

type Db = Pick<SupabaseClient, 'from'>

export function friendlyPlacementError(message?: string): string {
  const text = (message ?? '').toLowerCase()
  if (text.includes('media_placements') && (text.includes('does not exist') || text.includes('schema cache') || text.includes('could not find'))) return 'Placements are not set up yet: the media placement database migration has not been run.'
  if (text.includes('row-level security') || text.includes('permission denied')) return 'The database refused this change: your session is not an active admin.'
  if (text.includes('duplicate key')) return 'That asset is already in this showcase.'
  return message ? `Database error: ${message}` : 'Something went wrong. Please try again.'
}

export async function listPlacements(db: Db, target: PlacementTarget): Promise<PlacementWithAsset[]> {
  if (!isValidTarget(target)) throw new MediaLibraryError('Unknown placement target.')
  const { data, error } = await db.from('media_placements').select(PLACEMENT_COLUMNS)
    .eq('target_type', target.type).eq('target_key', target.key).eq('slot', target.slot)
    .order('display_order', { ascending: true }).limit(200)
  if (error) throw new MediaLibraryError(friendlyPlacementError(error.message))
  const rows = (data ?? []) as unknown as MediaPlacement[]
  const ids = rows.map((row) => row.media_asset_id)
  const assets: MediaAsset[] = []
  for (let i = 0; i < ids.length; i += 100) assets.push(...await getAssetsByIds(db, ids.slice(i, i + 100)))
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  return rows.sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id)).map((row) => ({ ...row, asset: byId.get(row.media_asset_id) ?? null }))
}

export interface AddPlacementsResult { added: number; skipped: string[] }

/** Add several library assets at once, after the existing ones, all switched off. One failure does not undo the others. */
export async function addPlacements(db: Db, target: PlacementTarget, assets: MediaAsset[], existing: MediaPlacement[]): Promise<AddPlacementsResult> {
  const placed = new Set(existing.map((row) => row.media_asset_id))
  let order = existing.reduce((max, row) => Math.max(max, row.display_order + 1), 0)
  const result: AddPlacementsResult = { added: 0, skipped: [] }
  for (const asset of assets) {
    if (placed.has(asset.id)) { result.skipped.push(`“${asset.title}” is already here.`); continue }
    const blocked = placementBlocker(asset)
    if (blocked) { result.skipped.push(`“${asset.title}”: ${blocked}`); continue }
    const { error } = await db.from('media_placements').insert(buildPlacementRow(asset, target, order))
    if (error) { result.skipped.push(`“${asset.title}”: ${friendlyPlacementError(error.message)}`); continue }
    placed.add(asset.id); order += 1; result.added += 1
  }
  return result
}

export async function updatePlacement(db: Db, placement: PlacementWithAsset, edit: PlacementEdit): Promise<void> {
  const target = { type: placement.target_type, key: placement.target_key, slot: placement.slot }
  const problem = validatePlacement(edit, placement.asset?.kind ?? 'image', target)
  if (problem) throw new MediaLibraryError(problem)
  const { data, error } = await db.from('media_placements').update({
    display_type: edit.display_type, custom_label: edit.display_type === 'other' ? edit.custom_label.trim() : '',
    title_override: edit.title_override.trim(), caption_override: edit.caption_override.trim(),
    related_project_id: edit.related_project_id, is_active: edit.is_active,
  }).eq('id', placement.id).select('id').maybeSingle()
  if (error) throw new MediaLibraryError(friendlyPlacementError(error.message))
  if (!data) throw new MediaLibraryError('This placement no longer exists. Reload the list.')
}

/** Removes the REFERENCE only. The library asset and its file are not touched. */
export async function removePlacement(db: Db, id: string): Promise<void> {
  if (!UUID.test(id)) throw new MediaLibraryError('Invalid placement id.')
  const { error } = await db.from('media_placements').delete().eq('id', id)
  if (error) throw new MediaLibraryError(friendlyPlacementError(error.message))
}

/** New order after moving one item up (-1) or down (+1): the rows whose stored order must change. */
export function reorderedPositions(rows: Array<Pick<MediaPlacement, 'id' | 'display_order'>>, index: number, direction: -1 | 1): Array<{ id: string; display_order: number }> {
  const target = index + direction
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return []
  const next = [...rows]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next.map((row, display_order) => ({ id: row.id, display_order, changed: row.display_order !== display_order }))
    .filter((row) => row.changed).map(({ id, display_order }) => ({ id, display_order }))
}

export async function movePlacement(db: Db, rows: MediaPlacement[], index: number, direction: -1 | 1): Promise<void> {
  for (const change of reorderedPositions(rows, index, direction)) {
    const { error } = await db.from('media_placements').update({ display_order: change.display_order }).eq('id', change.id)
    if (error) throw new MediaLibraryError(friendlyPlacementError(error.message))
  }
}
