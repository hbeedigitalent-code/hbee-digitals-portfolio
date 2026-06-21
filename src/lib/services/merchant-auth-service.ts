// src/lib/services/merchant-auth-service.ts

import { createClient } from '@supabase/supabase-js'

// Use the regular client with anon key for public operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a regular client for public operations
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client - only if service role key is available
let supabaseAdmin: any = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin

  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not available')
    return null
  }

  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    return supabaseAdmin
  } catch (e) {
    console.warn('⚠️ Failed to initialize Supabase admin:', e)
    return null
  }
}

export interface MerchantSignupData {
  business_name: string
  contact_name: string
  email: string
  whatsapp?: string
  website_url?: string
  country?: string
  industry?: string
  password: string
}

export async function createMerchantAccount(data: MerchantSignupData) {
  console.log('📝 Creating merchant account for:', data.email)

  try {
    // STEP 1: Sign up the user using the regular client (with email confirmation)
    console.log('📝 Signing up user with email...')
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.contact_name,
          business_name: data.business_name,
          role: 'merchant',
        },
      },
    })

    if (signUpError) {
      console.error('❌ Sign up error:', signUpError)
      
      // If user already exists, give a friendly message
      if (signUpError.message.includes('already registered')) {
        return {
          success: false,
          error: 'An account with this email already exists. Please login instead.',
        }
      }
      
      return {
        success: false,
        error: signUpError.message || 'Failed to create account. Please try again.',
      }
    }

    if (!authData.user) {
      console.error('❌ No user returned from sign up')
      return {
        success: false,
        error: 'Failed to create account. Please try again.',
      }
    }

    console.log('✅ User created:', authData.user.id)

    // STEP 2: Create merchant profile in the database
    console.log('📝 Creating merchant profile...')
    
    // Use the admin client if available, otherwise use the regular client with RLS
    const dbClient = getSupabaseAdmin() || supabase
    
    const { data: merchant, error: merchantError } = await dbClient
      .from('merchant_accounts')
      .insert({
        id: authData.user.id,
        business_name: data.business_name,
        contact_name: data.contact_name,
        email: data.email,
        whatsapp: data.whatsapp || null,
        website_url: data.website_url || null,
        country: data.country || null,
        industry: data.industry || null,
        status: 'active',
        email_verified: false,
      })
      .select()
      .single()

    if (merchantError) {
      console.error('❌ Merchant error:', merchantError)
      // User was created but merchant profile failed - still return success
      return {
        success: true,
        merchant: null,
        user: authData.user,
        warning: 'Account created. Please check your email to confirm your account.',
      }
    }

    console.log('✅ Merchant profile created')

    return {
      success: true,
      merchant,
      user: authData.user,
      message: 'Account created. Please check your email to confirm your account.',
    }
  } catch (error) {
    console.error('❌ Create merchant error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account. Please try again.',
    }
  }
}