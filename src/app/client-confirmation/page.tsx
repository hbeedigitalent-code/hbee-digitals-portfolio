'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // ADD THIS IMPORT
import { createClientComponentClient } from '@/lib/supabase-client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ClientConfirmationPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading')
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [merchantExists, setMerchantExists] = useState(false)

  useEffect(() => {
    async function handleConfirmation() {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setStatus('error')
          setMessage('Unable to verify your session. The link may have expired.')
          return
        }

        if (!session) {
          // Check if there's a hash fragment (for magic link)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken) {
            // Try to set session with the token from URL
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            
            if (!setSessionError) {
              // Session set, now get user
              const { data: { user }, error: userError } = await supabase.auth.getUser()
              if (!userError && user) {
                await handleUser(user)
                return
              }
            }
          }
          
          setStatus('error')
          setMessage('No active session. Please try logging in.')
          return
        }

        await handleUser(session.user)
      } catch (err) {
        console.error('Confirmation error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    async function handleUser(user: any) {
      setUserEmail(user.email || '')
      setUserId(user.id)

      console.log('📝 User from session:', user)

      // Check if merchant account exists
      const { data: merchant, error: merchantError } = await supabase
        .from('merchant_accounts')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (merchantError) {
        console.error('Merchant check error:', merchantError)
      }

      if (merchant) {
        setMerchantExists(true)
        console.log('✅ Merchant account found:', merchant)
      } else {
        console.log('⚠️ No merchant account found for user:', user.id)
      }

      // Check if email is confirmed
      if (user.email_confirmed_at) {
        setStatus('success')
        setMessage('Your email has been confirmed! Your account is now active.')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/client-login?confirmed=true')
        }, 3000)
      } else {
        // Email not confirmed - show resend option
        setStatus('resend')
        setMessage('Your email has not been confirmed yet. Please click the link in the email we sent you.')
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
        console.error('Resend error:', error)
        alert('Failed to resend confirmation email. Please try again.')
      } else {
        alert('Confirmation email resent! Please check your inbox (and spam folder).')
        setStatus('loading')
        // Check again after 2 seconds
        setTimeout(async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email_confirmed_at) {
            setStatus('success')
            setMessage('Email confirmed! Redirecting...')
            setTimeout(() => router.push('/client-login?confirmed=true'), 2000)
          } else {
            setStatus('resend')
          }
        }, 2000)
      }
    } catch (err) {
      console.error('Resend error:', err)
      alert('Failed to resend confirmation email.')
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-navy)] px-4 py-20">
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
              {userEmail && (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Verified: <span className="text-white">{userEmail}</span>
                </p>
              )}
              {merchantExists && (
                <p className="mt-1 text-sm text-[var(--accent-lime)]">✅ Client profile found</p>
              )}
              <p className="mt-1 text-sm text-[var(--text-muted)]">Redirecting to login...</p>
              <button
                onClick={() => router.push('/client-login?confirmed=true')}
                className="mt-6 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
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
                  We sent a confirmation link to: <span className="text-white">{userEmail}</span>
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
              <h1 className="text-2xl font-bold text-white">Confirmation Issue</h1>
              <p className="mt-2 text-[var(--text-muted)]">{message}</p>
              {userEmail && (
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Email: <span className="text-white">{userEmail}</span>
                </p>
              )}
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => router.push('/client-login')}
                  className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
                >
                  Try Logging In
                </button>
                <Link
                  href="/contact"
                  className="rounded-full border border-[var(--border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
                >
                  Contact Support
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}