import { supabase } from '@/lib/supabase'
import { isCapabilitySlug, portfolioCreativeEnabled, readCreativeMedia, type PortfolioMedia } from '@/lib/portfolio-creative'
import { buildWorkData, type WorkItem } from './work-data'

/** Default-off rollout: no new-table reads before owner-approved migration. */
export async function getPortfolioMedia(portfolioId: string): Promise<PortfolioMedia[]> {
  if (!portfolioCreativeEnabled()) return []
  try {
    const { data, error } = await supabase.from('portfolio_media').select('*').eq('portfolio_id', portfolioId).eq('is_visible', true).order('display_order').limit(100)
    return error ? [] : readCreativeMedia(data || [])
  } catch { return [] }
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
