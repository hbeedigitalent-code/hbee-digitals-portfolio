import { supabase } from '@/lib/supabase'
import { publicTrustBrands, type PublicTrustBrand } from '@/lib/trusted-brands'

if (typeof window !== 'undefined') throw new Error('trusted-brands-data is server-only')

/** Public anonymous client, existing RLS, and homepage ISR. No privileged read. */
export async function getHomepageBrands(): Promise<PublicTrustBrand[]> {
  try {
    const { data, error } = await supabase.from('trust_section').select('partner_logos,is_active').eq('is_active', true).maybeSingle()
    return error ? [] : publicTrustBrands(data)
  } catch { return [] }
}
