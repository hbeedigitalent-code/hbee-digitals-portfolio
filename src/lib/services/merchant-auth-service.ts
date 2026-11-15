// src/lib/services/merchant-auth-service.ts

import { createClient } from '@supabase/supabase-js'
import { SIGNUP_GENERIC_ERROR, SIGNUP_NEUTRAL_MESSAGE, signUpOutcomeFor } from '@/lib/client-portal/signup-response'

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

export interface MerchantSignupResult {
  success: boolean
  message?: string
  error?: string
  user?: unknown
}

export async function createMerchantAccount(data: MerchantSignupData): Promise<MerchantSignupResult> {
  // The address is deliberately not logged.

  try {
    // Sign up the user - Supabase handles the email confirmation
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/client-confirmation`,
        // The ordinary profile fields the signup form collects are carried on
        // the auth record so provisioning can read them at confirmation time,
        // when a verified session finally exists. They are ORDINARY fields
        // only: no status, verification, merchant link, score or approval
        // value is placed here, and provisioning never reads one from here.
        data: {
          full_name: data.contact_name,
          contact_name: data.contact_name,
          business_name: data.business_name,
          whatsapp: data.whatsapp || null,
          website_url: data.website_url || null,
          country: data.country || null,
          industry: data.industry || null,
          role: 'merchant',
        },
      },
    })

    if (signUpError) {
      // Never log or return the address, and never return Supabase's own wording: "already registered" would
      // confirm to a stranger that an email has an account. See signup-response.ts.
      console.error('❌ Sign up error (code=' + String((signUpError as { code?: string }).code ?? 'n/a') + ')')
      return signUpOutcomeFor(signUpError)
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Failed to create account. Please try again.',
      }
    }


    // NO TABLE WRITES HAPPEN HERE.
    //
    // signUp() with email confirmation enabled returns a user but NO session,
    // so anything written from this point would run as the ANON role. The two
    // inserts that used to live here (merchant_accounts, then clients) only
    // worked because of broad anon grants, and both had their errors logged
    // and swallowed — signup reported success whether or not the records
    // existed.
    //
    // Provisioning now happens once a verified identity exists, at email
    // confirmation: server-side in /api/auth/confirm, and from the
    // confirmation page via POST /api/account/provision. Both call the same
    // idempotent provisionAccount() helper, so opening the confirmation link
    // twice creates nothing twice and overwrites nothing.
    //
    // Supabase sends the confirmation email as part of signUp() above. No
    // second email is sent from anywhere in this flow.

    // THE ONE CASE WHERE A SESSION EXISTS IMMEDIATELY. If the project has
    // email confirmation switched off, signUp() returns a session and there is
    // no confirmation step to provision from. Provision now, through the same
    // session-gated endpoint. When confirmation IS required — the configured
    // behaviour — authData.session is null, this block is skipped, and the user
    // is told to check their email exactly as before.
    if (authData.session) {
      try {
        const response = await fetch('/api/account/provision', {
          method: 'POST',
          credentials: 'same-origin',
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          console.error('❌ Account provisioning failed:', payload?.error || response.status)
          return {
            success: false,
            error:
              'Your login was created but your account setup did not finish. Please contact support.',
          }
        }
      } catch (provisionError) {
        console.error('❌ Account provisioning request failed:', provisionError)
        return {
          success: false,
          error:
            'Your login was created but your account setup did not finish. Please contact support.',
        }
      }
    }

    return {
      success: true,
      user: authData.user,
      // Deliberately worded around confirmation, not completion: the client
      // and merchant records are created when the email is confirmed.
      message: SIGNUP_NEUTRAL_MESSAGE,
    }
  } catch (error) {
    console.error('❌ Create merchant error:', error)
    return {
      success: false,
      error: SIGNUP_GENERIC_ERROR,
    }
  }
}