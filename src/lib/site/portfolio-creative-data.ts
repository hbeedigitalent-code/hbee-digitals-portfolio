import { supabase } from '@/lib/supabase'
import { isCapabilitySlug, portfolioCreativeEnabled, readCreativeMedia, type CapabilitySlug, type PortfolioMedia } from '@/lib/portfolio-creative'
import { buildWorkData, type WorkCreativeIndex, type WorkItem } from './work-data'

/** Default-off rollout: no new-table reads before owner-approved migration. */
export async function getPortfolioMedia(portfolioId: string): Promise<PortfolioMedia[]> {
  if (!portfolioCreativeEnabled()) return []
  try {
    const { data, error } = await supabase.from('portfolio_media').select('*').eq('portfolio_id', portfolioId).eq('is_visible', true).order('display_order').limit(100)
    return error ? [] : readCreativeMedia(data || [])
  } catch { return [] }
}

/** Explicit capability assignments for one engagement. Unknown slugs are dropped. */
export async function getPortfolioCapabilities(portfolioId: string): Promise<CapabilitySlug[]> {
  if (!portfolioCreativeEnabled()) return []
  try {
    const { data, error } = await supabase.from('portfolio_capabilities').select('capability_slug').eq('portfolio_id', portfolioId)
    if (error || !data) return []
    return data.map((row) => row.capability_slug).filter(isCapabilitySlug)
  } catch { return [] }
}

/**
 * Listing support: capability assignments and a visible-media cover fallback for
 * many engagements in two queries. Hidden media is excluded both here
 * (is_visible = true) and by RLS. A failed read yields an empty index, so the
 * listing falls back to the legacy fields instead of failing.
 */
export async function getWorkCreativeIndex(ids: string[]): Promise<WorkCreativeIndex | undefined> {
  if (!portfolioCreativeEnabled()) return undefined
  const index: WorkCreativeIndex = { capabilities: {}, cover: {} }
  if (!ids.length) return index
  try {
    const [assignments, media] = await Promise.all([
      supabase.from('portfolio_capabilities').select('portfolio_id,capability_slug').in('portfolio_id', ids),
      supabase.from('portfolio_media').select('portfolio_id,id,image_url,alt_text,display_order,media_kind').in('portfolio_id', ids).eq('is_visible', true).order('display_order').limit(1000),
    ])
    if (!assignments.error) {
      for (const row of assignments.data || []) {
        if (!isCapabilitySlug(row.capability_slug)) continue
        const key = String(row.portfolio_id)
        ;(index.capabilities[key] ||= []).push(row.capability_slug)
      }
    }
    if (!media.error) {
      const rows = [...(media.data || [])].sort((a, b) => Number(a.display_order) - Number(b.display_order) || String(a.id).localeCompare(String(b.id)))
      for (const row of rows) {
        const key = String(row.portfolio_id)
        if (!index.cover[key] && typeof row.image_url === 'string' && typeof row.alt_text === 'string') index.cover[key] = { src: row.image_url, alt: row.alt_text }
      }
    }
  } catch { /* keep whatever was read; the listing degrades to legacy fields */ }
  return index
}

export async function getCapabilityWork(slug: string): Promise<WorkItem[]> {
  if (!portfolioCreativeEnabled() || !isCapabilitySlug(slug)) return []
  try {
    const assignments = await supabase.from('portfolio_capabilities').select('portfolio_id').eq('capability_slug', slug)
    if (assignments.error || !assignments.data?.length) return []
    const ids = assignments.data.map((row) => row.portfolio_id)
    const { data, error } = await supabase.from('portfolio_items').select('*').in('id', ids).eq('is_active', true).order('featured', { ascending: false }).order('display_order', { ascending: true }).limit(3)
    return error ? [] : buildWorkData((data || []).filter((row) => row.is_active === true && ids.includes(row.id))).items.slice(0, 3)
  } catch { return [] }
}
