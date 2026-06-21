// src/lib/services/merchant-auth-service.ts

// Lazy initialize Supabase admin client
let supabaseAdmin: any = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase admin credentials not available')
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

let resendInstance: any = null

function getResend() {
  if (resendInstance) return resendInstance

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('⚠️ Resend API key not available')
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

export async function createMerchantAccount(data: MerchantSignupData) {
  // Log what we're trying to do
  console.log('📝 Creating merchant account for:', data.email)

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('❌ Supabase admin not available')
    return {
      success: false,
      error: 'System configuration error. Please contact support.',
    }
  }

  try {
    // 1. Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers()

    if (!checkError && existingUsers) {
      const userExists = existingUsers.users.some((u: any) => u.email === data.email)
      if (userExists) {
        return {
          success: false,
          error: 'An account with this email already exists. Please login instead.',
        }
      }
    }

    // 2. Create user in Supabase Auth
    console.log('📝 Creating auth user...')
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

    if (authError) {
      console.error('❌ Auth error:', authError)
      return {
        success: false,
        error: authError.message || 'Failed to create account. Please try again.',
      }
    }

    if (!authUser.user) {
      console.error('❌ No user returned from auth')
      return {
        success: false,
        error: 'Failed to create account. Please try again.',
      }
    }

    console.log('✅ Auth user created:', authUser.user.id)

    // 3. Create merchant account
    console.log('📝 Creating merchant profile...')
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
        status: 'active',
        email_verified: true,
      })
      .select()
      .single()

    if (merchantError) {
      console.error('❌ Merchant error:', merchantError)
      // User was created but merchant profile failed - still return success but log error
      return {
        success: true,
        merchant: null,
        user: authUser.user,
        warning: 'Account created but profile setup incomplete. Please contact support.',
      }
    }

    console.log('✅ Merchant profile created')

    // 4. Send welcome email (if Resend is available)
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

    return { success: true, merchant, user: authUser.user }
  } catch (error) {
    console.error('❌ Create merchant error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account. Please try again.',
    }
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