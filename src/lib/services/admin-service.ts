// src/lib/services/admin-service.ts
import { createClientComponentClient } from '@/lib/supabase-client'

export async function isAdmin(userId: string): Promise<boolean> {
  if (!userId) {
    console.log('❌ isAdmin: No userId provided')
    return false
  }
  
  console.log('🔍 isAdmin: Checking userId:', userId)
  
  try {
    const supabase = createClientComponentClient()
    
    // First, try to get the user directly from admin_users
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    
    if (error) {
      console.error('❌ isAdmin: Query error:', error)
      return false
    }
    
    console.log('✅ isAdmin: Query result:', data)
    
    if (data) {
      console.log('✅ isAdmin: User is admin!')
      return true
    }
    
    // If not found, try checking by email as fallback
    console.log('⚠️ isAdmin: User not found by ID, trying email fallback...')
    
    // Get the user's email from auth
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.email) {
      const { data: emailData, error: emailError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .maybeSingle()
      
      if (emailError) {
        console.error('❌ isAdmin: Email query error:', emailError)
        return false
      }
      
      if (emailData) {
        console.log('✅ isAdmin: User found by email!')
        return true
      }
    }
    
    console.log('❌ isAdmin: User is NOT admin')
    return false
  } catch (err) {
    console.error('❌ isAdmin: Unexpected error:', err)
    return false
  }
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