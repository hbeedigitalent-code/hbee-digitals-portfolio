'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

function ConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function handleConfirmation() {
      try {
        // 1. Check if we have a session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user?.email_confirmed_at) {
          // Already confirmed - create client profile and redirect
          await createClientProfile(session.user)
          setStatus('success')
          setMessage('Your email has been confirmed! Your account is now active.')
          setTimeout(() => router.push('/client-login?confirmed=true'), 2000)
          return
        }

        // 2. Check URL hash for tokens (Supabase sends tokens here)
        const hash = window.location.hash
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const type = hashParams.get('type')

          console.log('🔍 Tokens found in hash:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

          if (accessToken) {
            // Set the session with the token
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })

            if (error) {
              console.error('❌ Session error:', error)
              setStatus('error')
              setMessage('The confirmation link is invalid or has expired.')
              return
            }

            if (data.user) {
              if (data.user.email_confirmed_at) {
                await createClientProfile(data.user)
                setStatus('success')
                setMessage('Your email has been confirmed! Your account is now active.')
                setTimeout(() => router.push('/client-login?confirmed=true'), 2000)
              } else {
                // Wait for confirmation
                let attempts = 0
                const maxAttempts = 10
                const checkInterval = setInterval(async () => {
                  attempts++
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user?.email_confirmed_at) {
                    clearInterval(checkInterval)
                    await createClientProfile(user)
                    setStatus('success')
                    setMessage('Your email has been confirmed! Your account is now active.')
                    setTimeout(() => router.push('/client-login?confirmed=true'), 2000)
                  } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval)
                    setStatus('error')
                    setMessage('Confirmation taking too long. Please try logging in.')
                  }
                }, 1500)
              }
              return
            }
          }
        }

        // 3. Check query params
        const confirmed = searchParams.get('confirmed')
        const error = searchParams.get('error')

        if (confirmed === 'true') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.email_confirmed_at) {
            await createClientProfile(user)
            setStatus('success')
            setMessage('Your email has been confirmed! Your account is now active.')
            setTimeout(() => router.push('/client-login?confirmed=true'), 2000)
          }
          return
        }

        if (error) {
          setStatus('error')
          setMessage(`Confirmation failed: ${error}`)
          return
        }

        // 4. No tokens found - user came here directly
        setStatus('error')
        setMessage('No confirmation link found. Please request a new one.')

      } catch (err) {
        console.error('❌ Confirmation error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred.')
      }
    }

    async function createClientProfile(user: any) {
      // Check if client profile exists
      const { data: existing } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        console.log('✅ Client already exists:', existing)
        return
      }

      // Create client profile
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
          email: user.email,
          business_name: user.user_metadata?.business_name || 'My Business',
          status: 'active',
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Create client error:', error)
      } else {
        console.log('✅ Client created:', client)
      }
    }

    handleConfirmation()
  }, [router, supabase, searchParams])

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--accent-orange)] border-t-transparent" />
        </div>
        <h1 className="text-2xl font-bold text-white">Confirming Your Email...</h1>
        <p className="mt-2 text-[var(--text-muted)]">Please wait while we verify your account.</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="rounded-full bg-[var(--accent-lime)]/10 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6">
          <SvgIcon name="check" size={40} color="var(--accent-lime)" />
        </div>
        <h1 className="text-2xl font-bold text-white">Email Confirmed! ✅</h1>
        <p className="mt-2 text-[var(--text-muted)]">{message}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="rounded-full bg-red-500/10 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6">
        <SvgIcon name="warning" size={40} color="#ef4444" />
      </div>
      <h1 className="text-2xl font-bold text-white">Confirmation Failed</h1>
      <p className="mt-2 text-[var(--text-muted)]">{message}</p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={() => router.push('/client-login')}
          className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
        >
          Go to Login
        </button>
        <a
          href="/contact"
          className="rounded-full border border-[var(--border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)] text-center"
        >
          Contact Support
        </a>
      </div>
    </div>
  )
}

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