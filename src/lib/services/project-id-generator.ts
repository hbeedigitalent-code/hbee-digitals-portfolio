import { createClientComponentClient } from '@/lib/supabase-client'

export async function generateProjectId(): Promise<string> {
  const supabase = createClientComponentClient()
  const year = new Date().getFullYear()
  
  const { count, error } = await supabase
    .from('client_onboarding_submissions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)

  if (error) {
    console.error('Error counting submissions:', error)
    const random = Math.floor(Math.random() * 9000) + 1000
    return `HBEE-${year}-${random}`
  }

  const nextNumber = (count || 0) + 1
  const paddedNumber = String(nextNumber).padStart(4, '0')
  
  return `HBEE-${year}-${paddedNumber}`
}