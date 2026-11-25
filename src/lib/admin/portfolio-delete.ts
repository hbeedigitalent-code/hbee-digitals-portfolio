import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * THE way a portfolio project is deleted from the Admin (list, editor and before / after screens).
 *
 * A project's media placements point at it by id (media_placements serves several kinds of target, so there is no foreign
 * key). They are removed here, after the project itself is confirmed deleted. Only references go: Media Library assets,
 * stored files and the same assets' placements on the Work page or capability pages are untouched. (A "related project"
 * link on those other placements is cleared by the database.)
 */
type Db = Pick<SupabaseClient, 'from'>

export interface PortfolioDeleteResult {
  /** Set when the project was deleted but its placement references could not be removed. */
  warning?: string
}

const missingTable = (message: string) => /media_placements/.test(message) && /(does not exist|schema cache|could not find)/i.test(message)

export async function deletePortfolioProject(db: Db, id: string): Promise<PortfolioDeleteResult> {
  const { data, error } = await db.from('portfolio_items').delete().eq('id', id).select('id')
  if (error) throw error
  // Row-level security can make a delete affect nothing without reporting an error: keep every placement in that case.
  if (!Array.isArray(data) || data.length === 0) throw new Error('The project was not deleted. Reload the page; your session may not have permission.')
  const warning = 'The project was deleted, but its media placements could not be removed. They are not public; the Media Library lists them as stale.'
  try {
    const cleanup = await db.from('media_placements').delete().eq('target_type', 'project').eq('target_key', String(id).toLowerCase())
    // Before the placement migration has run there is nothing to clean up.
    if (cleanup.error && !missingTable(cleanup.error.message ?? '')) return { warning }
  } catch { return { warning } }
  return {}
}
