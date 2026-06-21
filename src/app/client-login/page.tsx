'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ClientLoginPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/client-portal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/client-reset-password`,
      })

      if (error) throw error

      setResetSent(true)
      setShowReset(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-navy)] px-4 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <SvgIcon name="logo" size={48} color="var(--accent-orange)" />
            </div>
            <h1 className="text-2xl font-bold text-white">Client Portal</h1>
            <p className="mt-2 text-[var(--text-muted)]">Sign in to access your projects</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            {resetSent ? (
              <div className="text-center py-4">
                <SvgIcon name="email" size={48} color="var(--accent-lime)" className="mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white">Check Your Email</h3>
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
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-white">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                      placeholder="you@email.com"
                      required
                    />
                  </div>

                  {!showReset && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-white">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                        placeholder="••••••••"
                        required
                      />
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
                      className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={loading}
                      className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
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
      </main>
      <Footer />
    </>
  )
}