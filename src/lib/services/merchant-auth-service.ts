// src/lib/services/merchant-auth-service.ts

// Lazy initialize Supabase admin client - only when needed
let supabaseAdmin: any = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase admin credentials not available (build environment)')
    return null
  }

  try {
    const { createClient } = require('@supabase/supabase-js')
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

// Lazy initialize Resend - only when needed
let resendInstance: any = null

function getResend() {
  if (resendInstance) return resendInstance

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('⚠️ Resend API key not available (build environment)')
    return null
  }

  try {
    const { Resend } = require('resend')
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

export interface MerchantLoginData {
  email: string
  password: string
}

export async function createMerchantAccount(data: MerchantSignupData) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return {
      success: false,
      error: 'Service unavailable. Please try again later.',
    }
  }

  try {
    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.contact_name,
        business_name: data.business_name,
        role: 'merchant',
      },
    })

    if (authError) throw authError
    if (!authUser.user) throw new Error('Failed to create user')

    // 2. Create merchant account
    const { data: merchant, error: merchantError } = await supabase
      .from('merchant_accounts')
      .insert({
        id: authUser.user.id,
        business_name: data.business_name,
        contact_name: data.contact_name,
        email: data.email,
        whatsapp: data.whatsapp || null,
        website_url: data.website_url || null,
        country: data.country || null,
        industry: data.industry || null,
        status: 'pending',
        email_verified: true,
      })
      .select()
      .single()

    if (merchantError) throw merchantError

    // 3. Send welcome email (if Resend is available)
    const resend = getResend()
    if (resend) {
      try {
        await sendWelcomeEmail(resend, data.email, data.contact_name, data.business_name)
      } catch (emailError) {
        console.error('Welcome email failed:', emailError)
        // Don't fail account creation
      }
    }

    return { success: true, merchant, user: authUser.user }
  } catch (error) {
    console.error('Create merchant error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create account' }
  }
}

export async function loginMerchant(data: MerchantLoginData) {
  try {
    // Use the standard client for login (not admin)
    const { createClient } = require('@supabase/supabase-js')
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
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
    const { createClient } = require('@supabase/supabase-js')
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'}/client-reset-password`,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Password reset error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send reset email' }
  }
}

export async function updatePassword(newPassword: string) {
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Update password error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update password' }
  }
}

export async function getMerchantProfile(userId: string) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return { success: false, error: 'Service unavailable' }
  }

  try {
    const { data, error } = await supabase
      .from('merchant_accounts')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error

    return { success: true, profile: data }
  } catch (error) {
    console.error('Get profile error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get profile' }
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
        <h2 style="color:#ffffff;font-size:24px;font-weight:700;margin-bottom:16px;">
          Welcome to Hbee Digitals
        </h2>
        
        <p style="color:#94A3B8;font-size:16px;line-height:1.7;">
          Hi ${name},
        </p>
        
        <p style="color:#94A3B8;font-size:16px;line-height:1.7;">
          Welcome to <strong style="color:#ffffff;">Hbee Digitals</strong>! Your merchant account for <strong style="color:#ffffff;">${business}</strong> has been created.
        </p>
        
        <p style="color:#94A3B8;font-size:16px;line-height:1.7;">
          You can now log in to your client portal to track your projects, upload files, respond to requests, and more.
        </p>
        
        <div style="margin-top:24px;padding:16px;background:#07111F;border-radius:12px;text-align:center;">
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