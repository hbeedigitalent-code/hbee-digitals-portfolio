'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ClientConfirmationPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Get the session to check if confirmation was successful
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setStatus('error')
        setMessage('Unable to confirm your email. The link may have expired.')
        return
      }

      // Check if user's email is confirmed
      if (data.session.user?.email_confirmed_at) {
        setStatus('success')
        setMessage('Your email has been confirmed! You can now log in.')
        setTimeout(() => {
          router.push('/client-login')
        }, 3000)
      } else {
        setStatus('error')
        setMessage('Email confirmation failed. Please try again.')
      }
    })
  }, [router, supabase])

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
              <h1 className="text-2xl font-bold text-white">Email Confirmed!</h1>
              <p className="mt-2 text-[var(--text-muted)]">{message}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Redirecting to login...</p>
              <button
                onClick={() => router.push('/client-login')}
                className="mt-6 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
              >
                Go to Login
              </button>
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
                  onClick={() => router.push('/client-login')}
                  className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => router.push('/client-signup')}
                  className="rounded-full border border-[var(--border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
                >
                  Create New Account
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}