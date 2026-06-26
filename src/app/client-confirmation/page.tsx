'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

// Component that handles confirmation - doesn't use useSearchParams
function ConfirmationContent() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading')
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function handleConfirmation() {
      try {
        // 1. Check if we have a session already (user is confirmed)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // User is already authenticated - check if email is confirmed
          if (session.user.email_confirmed_at) {
            // Check/create profiles
            await checkAndCreateProfiles(session.user)
            setStatus('success')
            setMessage('Your email has been confirmed! Your account is now active.')
            setTimeout(() => router.push('/client-login?confirmed=true'), 3000)
            return
          }
        }

        // 2. Check URL hash for tokens (Supabase sends tokens in hash fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        console.log('🔍 URL hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

        if (accessToken) {
          // Try to set the session with the token from URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            console.error('❌ Set session error:', error)
            setStatus('error')
            setMessage('The confirmation link is invalid or has expired. Please request a new one.')
            return
          }

          if (data.user) {
            setUserEmail(data.user.email || '')
            
            // Check if email is confirmed
            if (data.user.email_confirmed_at) {
              await checkAndCreateProfiles(data.user)
              setStatus('success')
              setMessage('Your email has been confirmed! Your account is now active.')
              setTimeout(() => router.push('/client-login?confirmed=true'), 3000)
              return
            } else {
              // Email not confirmed yet - might need to wait
              setStatus('resend')
              setMessage('Your email is being confirmed. Please wait a moment...')
              // Poll for confirmation
              let attempts = 0
              const maxAttempts = 10
              const checkInterval = setInterval(async () => {
                attempts++
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.email_confirmed_at) {
                  clearInterval(checkInterval)
                  await checkAndCreateProfiles(user)
                  setStatus('success')
                  setMessage('Your email has been confirmed! Your account is now active.')
                  setTimeout(() => router.push('/client-login?confirmed=true'), 3000)
                } else if (attempts >= maxAttempts) {
                  clearInterval(checkInterval)
                  setStatus('resend')
                  setMessage('Confirmation is taking longer than expected. Please try resending the confirmation email.')
                }
              }, 2000)
              return
            }
          }
        }

        // 3. Check if user is already confirmed from query param
        const urlParams = new URLSearchParams(window.location.search)
        const confirmed = urlParams.get('confirmed')
        if (confirmed === 'true') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await checkAndCreateProfiles(user)
            setStatus('success')
            setMessage('Your email has been confirmed! Your account is now active.')
            setTimeout(() => router.push('/client-login?confirmed=true'), 3000)
            return
          }
        }

        // 4. No tokens found - check if user is already logged in
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email_confirmed_at) {
          await checkAndCreateProfiles(user)
          setStatus('success')
          setMessage('Your email has been confirmed! Your account is now active.')
          setTimeout(() => router.push('/client-login?confirmed=true'), 3000)
          return
        }

        // 5. No valid confirmation found
        setStatus('resend')
        setMessage('No valid confirmation link found. Please request a new confirmation email.')
        
      } catch (err) {
        console.error('❌ Confirmation error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    async function checkAndCreateProfiles(user: any) {
      setUserEmail(user.email || '')
      
      // Check merchant_accounts
      const { data: merchant } = await supabase
        .from('merchant_accounts')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!merchant) {
        // Create merchant account
        await supabase.from('merchant_accounts').insert({
          id: user.id,
          business_name: user.user_metadata?.business_name || 'My Business',
          contact_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
          email: user.email,
          status: 'active',
          email_verified: true,
        })
      }

      // Check clients
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!client) {
        // Create client profile
        await supabase.from('clients').insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
          email: user.email,
          business_name: user.user_metadata?.business_name || 'My Business',
          status: 'active',
        })
      }
    }

    handleConfirmation()
  }, [router, supabase])

  const resendConfirmation = async () => {
    if (!userEmail) return
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/client-confirmation`,
        },
      })
      
      if (error) {
        alert('Failed to resend confirmation email. Please try again.')
      } else {
        alert('Confirmation email resent! Please check your inbox (and spam folder).')
        setStatus('loading')
        // Check after 3 seconds
        setTimeout(async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email_confirmed_at) {
            setStatus('success')
            setMessage('Email confirmed! Redirecting...')
            setTimeout(() => router.push('/client-login?confirmed=true'), 2000)
          } else {
            setStatus('resend')
            setMessage('Please check your email and click the confirmation link.')
          }
        }, 3000)
      }
    } catch (err) {
      alert('Failed to resend confirmation email.')
    }
  }

  return (
    <div className="w-full max-w-md text-center">
      {status === 'loading' && (
        <>
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--accent-orange)] border-t-transparent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Confirming Your Email...</h1>
          <p className="mt-2 text-[var(--text-muted)]">Please wait while we verify your account.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="rounded-full bg-[var(--accent-lime)]/10 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6">
            <SvgIcon name="check" size={40} color="var(--accent-lime)" />
          </div>
          <h1 className="text-2xl font-bold text-white">Email Confirmed! ✅</h1>
          <p className="mt-2 text-[var(--text-muted)]">{message}</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Redirecting to login...</p>
          <button
            onClick={() => router.push('/client-login?confirmed=true')}
            className="mt-4 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
          >
            Go to Login
          </button>
        </>
      )}

      {status === 'resend' && (
        <>
          <div className="rounded-full bg-yellow-500/10 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6">
            <SvgIcon name="email" size={40} color="#FBBF24" />
          </div>
          <h1 className="text-2xl font-bold text-white">Confirm Your Email</h1>
          <p className="mt-2 text-[var(--text-muted)]">{message}</p>
          {userEmail && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Email: <span className="text-white">{userEmail}</span>
            </p>
          )}
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Please check your inbox and spam folder.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={resendConfirmation}
              className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
            >
              Resend Confirmation Email
            </button>
            <button
              onClick={() => router.push('/client-login')}
              className="rounded-full border border-[var(--border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
            >
              Try Logging In
            </button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="rounded-full bg-red-500/10 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6">
            <SvgIcon name="warning" size={40} color="#ef4444" />
          </div>
          <h1 className="text-2xl font-bold text-white">Confirmation Failed</h1>
          <p className="mt-2 text-[var(--text-muted)]">{message}</p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={resendConfirmation}
              className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
            >
              Resend Confirmation
            </button>
            <a
              href="/contact"
              className="rounded-full border border-[var(--border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)] text-center"
            >
              Contact Support
            </a>
          </div>
        </>
      )}
    </div>
  )
}

// Main page component with Suspense boundary
export default function ClientConfirmationPage() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-navy)] px-4 py-20">
        <Suspense fallback={
          <div className="flex justify-center items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
          </div>
        }>
          <ConfirmationContent />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}