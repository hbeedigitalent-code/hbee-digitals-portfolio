'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  
  // 2FA states
  const [show2FA, setShow2FA] = useState(false)
  const [twoFACode, setTwoFACode] = useState('')
  const [tempUserId, setTempUserId] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Check if 2FA is enabled for this user
        const { data: twoFAData } = await supabase
          .from('admin_2fa')
          .select('is_enabled')
          .eq('user_id', data.user.id)
          .single()

        if (twoFAData?.is_enabled) {
          // Store user ID temporarily and show 2FA input
          setTempUserId(data.user.id)
          setShow2FA(true)
          setLoading(false)
          return
        }

        // No 2FA, redirect to dashboard
        router.push('/admin/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
    setLoading(false)
  }

  const handle2FAVerify = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, token: twoFACode })
      })

      const result = await response.json()

      if (result.success) {
        router.push('/admin/dashboard')
      } else {
        setError(result.error || 'Invalid 2FA code')
      }
    } catch {
      setError('Failed to verify 2FA code')
    }
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setResetSent(true)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setResetLoading(false)
    }
  }

  // Show 2FA input after successful password login
  if (show2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-4">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 shadow-lg">
              <SvgIcon name="security" size={32} color="var(--accent)" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Two-Factor Authentication</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Enter the code from your authenticator app</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-lg)]">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Authentication Code</label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-3 text-center text-2xl tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={handle2FAVerify}
                disabled={loading || twoFACode.length !== 6}
                className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <div className="text-center">
                <button
                  onClick={() => {
                    setShow2FA(false)
                    setTempUserId(null)
                    setTwoFACode('')
                  }}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Normal login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 shadow-lg">
            <SvgIcon name="logo" size={32} color="var(--accent)" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text-primary)]">Admin Login</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign in to manage your content</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-lg)]">
          {!resetMode ? (
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                    placeholder="admin@hbeedigitals.com"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                {!resetSent ? (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Email Address</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]/50"
                        placeholder="admin@hbeedigitals.com"
                        required
                      />
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-400">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
                    >
                      {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </>
                ) : (
                  <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 p-4 text-center">
                    <SvgIcon name="verified" size={32} color="var(--accent)" className="mx-auto mb-3" />
                    <p className="font-bold text-[var(--accent)]">Reset link sent!</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Check your email for a password reset link.
                    </p>
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(false)
                      setResetSent(false)
                      setError('')
                    }}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
                  >
                    ← Back to login
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Secure admin access for Hbee Digitals team members only.
        </p>
      </div>
    </div>
  )
}