'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import { attemptProvisionOnce } from '@/lib/client-portal/account-recovery'
import { friendlyLoginError, friendlyResetError, RESET_MESSAGES } from '@/lib/client-portal/auth-messages'
import { postLoginDestination } from '@/lib/client-portal/portal-session'

// Create a separate component that uses useSearchParams
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  // A signed-in user with no client profile is sent here by the portal (?account=no-profile). 'checking' = one idempotent
  // provisioning attempt is running; 'help' = it did not fix it, so show Try again / Sign out / Contact.
  const [recovery, setRecovery] = useState<'idle' | 'checking' | 'help'>(searchParams.get('account') === 'no-profile' ? 'checking' : 'idle')
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null)
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryNote, setRecoveryNote] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState('')

  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    if (confirmed === 'true') {
      setConfirmationMessage('Your email has been confirmed! Please log in.')
    }

    const reset = searchParams.get('reset')
    if (reset === 'success') {
      setConfirmationMessage('Your password has been reset successfully! Please log in.')
    }
  }, [searchParams])

  // Recovery for a signed-in user with no client profile. Automatic provisioning is attempted at most once per browser session
  // (account-recovery.ts); after that only the "Try again" button retries, so this can never loop with the portal's redirect.
  useEffect(() => {
    if (searchParams.get('account') !== 'no-profile') return
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setRecovery('idle') // not signed in: this is an ordinary login
        return
      }
      setRecoveryUserId(user.id)
      const outcome = await attemptProvisionOnce(user.id)
      if (cancelled) return
      if (outcome === 'recovered') {
        router.replace(postLoginDestination(searchParams.get('next')))
        return
      }
      setRecovery('help')
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const retryRecovery = async () => {
    if (!recoveryUserId) return
    setRecoveryBusy(true)
    setRecoveryNote('')
    const outcome = await attemptProvisionOnce(recoveryUserId, { force: true })
    setRecoveryBusy(false)
    if (outcome === 'recovered') router.replace(postLoginDestination(searchParams.get('next')))
    else setRecoveryNote("That didn't work. Please try once more, or contact Hbee Digitals.")
  }

  const signOutFromRecovery = async () => {
    await supabase.auth.signOut()
    setRecovery('idle')
    router.replace('/client-login')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setConfirmationMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Return to the page the client asked for when it is a validated portal path (or the invitation page); else the portal.
      router.push(postLoginDestination(searchParams.get('next')))
    } catch (err) {
      setError(friendlyLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError(RESET_MESSAGES.emailRequired)
      return
    }

    setLoading(true)
    setError('')
    setConfirmationMessage('')

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/client-reset-password`,
      })

      if (error) throw error

      setResetSent(true)
      setShowReset(false)
    } catch (err) {
      setError(friendlyResetError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <SvgIcon name="logo" size={48} color="var(--accent-orange)" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Client Portal</h1>
        <p className="mt-2 text-[var(--text-muted)]">Sign in to access your projects</p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        {recovery === 'checking' ? (
          <div className="py-6 text-center" role="status" aria-live="polite">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
            <p className="text-[var(--text-muted)]">Checking your account…</p>
          </div>
        ) : recovery === 'help' ? (
          <div className="py-2 text-center" role="alert">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">We couldn&apos;t open your portal</h3>
            <p className="mt-2 text-[var(--text-muted)]">
              You&apos;re signed in, but your account isn&apos;t fully set up yet. You can try again, or contact Hbee Digitals and we will sort it out.
            </p>
            {recoveryNote && <p className="mt-3 text-sm text-red-400">{recoveryNote}</p>}
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={retryRecovery}
                disabled={recoveryBusy || !recoveryUserId}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-[var(--cta-text)] transition hover:bg-[var(--orange-600)] disabled:opacity-50"
              >
                {recoveryBusy ? 'Trying again…' : 'Try again'}
              </button>
              <Link href="/contact" className="w-full rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-orange)]">
                Contact Hbee Digitals
              </Link>
              <button type="button" onClick={signOutFromRecovery} className="text-sm text-[var(--text-muted)] transition hover:text-[var(--accent-orange)]">
                Sign out
              </button>
            </div>
          </div>
        ) : resetSent ? (
          <div className="text-center py-4">
            <SvgIcon name="email" size={48} color="var(--accent-lime)" className="mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Check Your Email</h3>
            <p className="mt-2 text-[var(--text-muted)]">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
            <button
              onClick={() => setResetSent(false)}
              className="mt-4 text-[var(--accent-orange)] hover:underline"
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            {confirmationMessage && (
              <div className="mb-4 rounded-lg bg-[var(--accent-lime)]/10 border border-[var(--accent-lime)]/30 p-3 text-sm text-[var(--accent-lime)]">
                {confirmationMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="you@email.com"
                  required
                />
              </div>

              {!showReset && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-page)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] pr-12"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <SvgIcon name="eye-off" size={20} color="var(--text-muted)" />
                      ) : (
                        <SvgIcon name="eye" size={20} color="var(--text-muted)" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {!showReset ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-[var(--cta-text)] transition hover:bg-[var(--orange-600)] disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-[var(--cta-text)] transition hover:bg-[var(--orange-600)] disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              )}
            </form>

            <div className="mt-4 text-center">
              {!showReset ? (
                <>
                  <button
                    onClick={() => setShowReset(true)}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-orange)] transition"
                  >
                    Forgot password?
                  </button>
                  <div className="mt-3 text-sm text-[var(--text-muted)]">
                    Don't have an account?{' '}
                    <Link href="/client-signup" className="text-[var(--accent-orange)] hover:underline">
                      Sign up
                    </Link>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setShowReset(false)}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-orange)] transition"
                >
                  Back to login
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function ClientLoginPage() {
  return (
    <>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Suspense fallback={
          <div className="flex justify-center items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
          </div>
        }>
          <LoginContent />
        </Suspense>
      </main>
    </>
  )
}