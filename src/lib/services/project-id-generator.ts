// src/lib/services/project-id-generator.ts
import { createClient } from '@supabase/supabase-js'

export async function generateProjectId(): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing, using fallback ID')
    const fallback = `HBEE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`
    return fallback
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const year = new Date().getFullYear()
  
  // Get count of submissions for this year
  const { count, error } = await supabase
    .from('client_onboarding_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)

  if (error) {
    console.error('Error counting submissions:', error)
    const random = Math.floor(Math.random() * 9000) + 1000
    return `HBEE-${year}-${String(random).padStart(4, '0')}`
  }

  // Next number starts from 1001
  const nextNumber = (count || 0) + 1001
  const paddedNumber = String(nextNumber).padStart(4, '0')
  
  return `HBEE-${year}-${paddedNumber}`
}