// src/lib/services/merchant-auth-service.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
    // Sign up the user - Supabase handles the email confirmation
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation`,
        data: {
          full_name: data.contact_name,
          business_name: data.business_name,
          role: 'merchant',
        },
      },
    })

    if (signUpError) {
      console.error('❌ Sign up error:', signUpError)
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
      return {
        success: false,
        error: 'Failed to create account. Please try again.',
      }
    }

    console.log('✅ User created:', authData.user.id)

    // Create merchant profile
    const { data: merchant, error: merchantError } = await supabase
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
      console.error('❌ Merchant profile error:', merchantError)
    } else {
      console.log('✅ Merchant profile created:', merchant)
    }

    // Create client profile
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: authData.user.id,
        full_name: data.contact_name,
        email: data.email,
        business_name: data.business_name,
        website_url: data.website_url || null,
        whatsapp: data.whatsapp || null,
        country: data.country || null,
        status: 'active',
      })
      .select()
      .single()

    if (clientError) {
      console.error('❌ Client profile error:', clientError)
    } else {
      console.log('✅ Client profile created:', client)
    }

    return {
      success: true,
      user: authData.user,
      message: 'Please check your email to confirm your account.',
    }
  } catch (error) {
    console.error('❌ Create merchant error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account.',
    }
  }
}