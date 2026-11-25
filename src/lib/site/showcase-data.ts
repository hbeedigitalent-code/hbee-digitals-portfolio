import { supabase } from '@/lib/supabase'
import { toShowcaseItems, type ShowcaseItem } from '@/lib/site/showcase-model'

if (typeof window !== 'undefined') throw new Error('showcase-data is server-only')

export type ShowcaseTarget =
  | { type: 'site'; key: 'work'; slot: 'creative_showcase' }
  | { type: 'service'; key: string; slot: 'showcase' }
  /** For projects the public key is the project SLUG; the database checks the project is active. */
  | { type: 'project'; key: string; slot: 'project_media' }

/**
 * Anonymous, server-side read through the one public function. Before the migration has run, or on any error, the result is
 * empty and the section simply does not render, so this code is safe to deploy first.
 */
export async function getShowcase(target: ShowcaseTarget): Promise<ShowcaseItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_media_showcase', { p_target_type: target.type, p_target_key: target.key, p_slot: target.slot })
    return error ? [] : toShowcaseItems(data)
  } catch { return [] }
}
