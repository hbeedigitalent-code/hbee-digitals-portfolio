// src/lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js'

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a dummy client
    if (process.env.VERCEL_ENV === 'production' || !process.env.VERCEL) {
      console.warn('Supabase env vars missing, using placeholder')
      return createClient('https://placeholder.supabase.co', 'placeholder-key')
    }
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = getSupabaseClient()