// src/lib/services/admin-service.ts
import { createClientComponentClient } from '@/lib/supabase-client'

export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) {
    console.log('❌ isAdmin: No userId provided')
    return false
  }
  
  console.log('🔍 isAdmin: Checking userId:', userId)
  
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, user_id, email')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  
  if (error) {
    console.error('❌ Admin check error:', error)
    return false
  }
  
  console.log('✅ isAdmin: Result:', data)
  
  return !!data
}

export async function getAdminUser(userId: string) {
  const supabase = createClientComponentClient()
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('Get admin error:', error)
    return null
  }
  
  return data
}