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
    // STEP 1: Sign up the user - Supabase handles the email
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

    // STEP 2: Create merchant profile in merchant_accounts table
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

    // STEP 3: Create client profile in clients table (for portal)
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

    // STEP 4: Check if profiles were created successfully
    const hasMerchant = !!merchant
    const hasClient = !!client

    if (!hasMerchant || !hasClient) {
      console.warn('⚠️ Some profiles were not created:', {
        hasMerchant,
        hasClient,
        merchantError: merchantError?.message,
        clientError: clientError?.message,
      })
    }

    return {
      success: true,
      merchant: merchant || null,
      client: client || null,
      user: authData.user,
      hasMerchant,
      hasClient,
      message: 'Please check your email to confirm your account. (Check spam folder)',
    }
  } catch (error) {
    console.error('❌ Create merchant error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account. Please try again.',
    }
  }
}

export async function getMerchantProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('merchant_accounts')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('❌ Get merchant error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('❌ Get merchant error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get merchant profile',
    }
  }
}

export async function getClientProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('❌ Get client error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('❌ Get client error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get client profile',
    }
  }
}

export async function createClientProfileFromMerchant(userId: string) {
  try {
    // First get the merchant data
    const { data: merchant, error: merchantError } = await supabase
      .from('merchant_accounts')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (merchantError || !merchant) {
      console.error('❌ Merchant not found:', merchantError)
      return { success: false, error: 'Merchant profile not found' }
    }

    // Get the user data
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return { success: false, error: 'User not found' }
    }

    // Create client profile
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        full_name: merchant.contact_name || user.user_metadata?.full_name || 'Client',
        email: merchant.email || user.email,
        business_name: merchant.business_name || user.user_metadata?.business_name || 'My Business',
        website_url: merchant.website_url || null,
        whatsapp: merchant.whatsapp || null,
        country: merchant.country || null,
        status: 'active',
      })
      .select()
      .single()

    if (clientError) {
      console.error('❌ Create client error:', clientError)
      return { success: false, error: clientError.message }
    }

    console.log('✅ Client profile created from merchant:', client)
    return { success: true, data: client }
  } catch (error) {
    console.error('❌ Create client from merchant error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create client profile',
    }
  }
}