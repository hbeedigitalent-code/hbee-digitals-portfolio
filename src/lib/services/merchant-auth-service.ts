// src/lib/services/merchant-auth-service.ts

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Use the regular client with anon key for public operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Resend instance
let resendInstance: any = null

function getResend() {
  if (resendInstance) return resendInstance

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('⚠️ Resend API key not available')
    return null
  }

  try {
    resendInstance = new Resend(apiKey)
    return resendInstance
  } catch (e) {
    console.warn('⚠️ Failed to initialize Resend:', e)
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
    // STEP 1: Sign up the user with email confirmation
    console.log('📝 Signing up user with email...')
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/client-login`,
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
      console.error('❌ No user returned from sign up')
      return {
        success: false,
        error: 'Failed to create account. Please try again.',
      }
    }

    console.log('✅ User created:', authData.user.id)

    // STEP 2: Create merchant profile in the database
    console.log('📝 Creating merchant profile...')
    
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
      console.error('❌ Merchant error:', merchantError)
    }

    // STEP 3: Send welcome email (using Resend)
    console.log('📝 Sending welcome email...')
    const resend = getResend()
    if (resend) {
      try {
        await sendWelcomeEmail(resend, data.email, data.contact_name, data.business_name)
        console.log('✅ Welcome email sent')
      } catch (emailError) {
        console.error('⚠️ Welcome email failed:', emailError)
        // Don't fail account creation
      }
    }

    return {
      success: true,
      merchant: merchant || null,
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

export async function loginMerchant(data: { email: string; password: string }) {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) throw error

    return { success: true, session: authData.session, user: authData.user }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
  }
}

export async function sendPasswordReset(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/client-reset-password`,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Password reset error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send reset email' }
  }
}

async function sendWelcomeEmail(
  resend: any,
  email: string,
  name: string,
  business: string
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'

  const html = `
    <div style="background:#07111F;padding:40px;font-family:Arial,sans-serif;color:#ffffff;">
      <div style="max-width:680px;margin:0 auto;background:#0E1B2D;border:1px solid #1E314A;border-radius:22px;padding:28px;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin-bottom:8px;">
            Welcome to Hbee Digitals
          </h1>
          <div style="display:inline-block;background:linear-gradient(135deg, #FF8A00, #39D97A);color:#07111F;padding:4px 16px;border-radius:9999px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
            Account Created
          </div>
        </div>
        
        <p style="color:#94A3B8;font-size:16px;line-height:1.7;">
          Hi ${name},
        </p>
        
        <p style="color:#94A3B8;font-size:16px;line-height:1.7;">
          Welcome to <strong style="color:#ffffff;">Hbee Digitals</strong>! Your merchant account for <strong style="color:#ffffff;">${business}</strong> has been created.
        </p>
        
        <p style="color:#94A3B8;font-size:16px;line-height:1.7;">
          Please confirm your email address to activate your account and access the client portal.
        </p>
        
        <div style="margin:24px 0;padding:16px;background:#07111F;border-radius:12px;text-align:center;">
          <a href="${siteUrl}/client-login" 
             style="display:inline-block;background:#FF8A00;color:#07111F;padding:12px 32px;border-radius:9999px;text-decoration:none;font-weight:700;">
            Login to Your Portal
          </a>
        </div>
        
        <div style="margin-top:24px;padding-top:24px;border-top:1px solid #1E314A;">
          <p style="color:#64748B;font-size:14px;">
            Warm regards,<br>
            <strong style="color:#ffffff;">Hbee Digitals</strong>
          </p>
          <p style="color:#64748B;font-size:12px;margin-top:8px;">
            <a href="${siteUrl}" style="color:#39D97A;text-decoration:none;">
              ${siteUrl}
            </a>
          </p>
        </div>
      </div>
    </div>
  `

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Hbee Digitals <noreply@send.hbeedigitals.com>',
      to: email,
      subject: `Welcome to Hbee Digitals - ${business}`,
      html,
    })
  } catch (error) {
    console.error('Welcome email error:', error)
    throw error
  }
}