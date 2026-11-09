// src/app/admin/login/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminAuthShell } from '@/components/admin/auth/AdminAuthShell'
import a from '@/components/admin/auth/admin-auth.module.css'

/**
 * Admin sign-in (Phase A1 presentation). LOGIN ONLY: there is deliberately no sign-up or "create account"
 * control; admin access is provisioned. Authentication is unchanged: signInWithPassword, then on to
 * /admin/dashboard. Whether a verification code is required is still decided entirely server-side by
 * middleware (the browser never queries admin_2fa).
 */
export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // /admin/login?reset=1 (linked from an invalid reset link) opens the reset-request form.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reset') === '1') setResetMode(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

      if (loginError) {
        // Plain, non-revealing wording for the common failure; anything else is shown as returned.
        setError(/invalid login credentials/i.test(loginError.message) ? 'The email or password is incorrect.' : loginError.message)
        setLoading(false)
        return
      }

      // Always continue to /admin/dashboard. Whether TOTP verification is required — and collecting it —
      // is decided entirely server-side: middleware redirects to the 2FA challenge when this account has
      // 2FA enabled and the session has not completed it yet.
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

  function leaveReset() {
    setResetMode(false)
    setResetSent(false)
    setError('')
  }

  return (
    <AdminAuthShell>
      <div className={a.card}>
        <p className={a.cardEyebrow}><span aria-hidden="true" className={a.node} />Team sign in</p>
        <h1 className={a.cardTitle}>{resetMode ? 'Reset your password' : 'Sign in to Hbee Administration'}</h1>
        <p className={a.cardText}>
          {resetMode ? 'Enter your work email and we will send a reset link.' : 'Use the email and password for your Hbee team account.'}
        </p>

        {!resetMode ? (
          <form onSubmit={handleLogin} className={a.form} noValidate={false}>
            <div className={a.field}>
              <label htmlFor="admin-email" className={a.label}>Email</label>
              <input id="admin-email" type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={a.input} placeholder="you@hbeedigitals.com" required aria-invalid={Boolean(error)} />
            </div>

            <div className={a.field}>
              <label htmlFor="admin-password" className={a.label}>Password</label>
              <div className={a.inputWrap}>
                <input id="admin-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${a.input} ${a.inputWithToggle}`} placeholder="Your password" required aria-invalid={Boolean(error)} />
                <button type="button" className={a.toggle} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className={a.error}>{error}</p>}

            <button type="submit" disabled={loading} className={a.submit}>
              {loading && <span aria-hidden="true" className={a.spinner} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className={a.linkRow}>
              <button type="button" className={a.linkBtn} onClick={() => { setResetMode(true); setError('') }}>Forgot password?</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className={a.form}>
            {!resetSent ? (
              <>
                <div className={a.field}>
                  <label htmlFor="admin-reset-email" className={a.label}>Email address</label>
                  <input id="admin-reset-email" type="email" name="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={a.input} placeholder="you@hbeedigitals.com" required />
                </div>
                {error && <p role="alert" className={a.error}>{error}</p>}
                <button type="submit" disabled={resetLoading} className={a.submit}>
                  {resetLoading && <span aria-hidden="true" className={a.spinner} />}
                  {resetLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </>
            ) : (
              <p role="status" className={a.success}><strong>Reset link sent</strong>Check your email for a password reset link.</p>
            )}
            <div className={a.linkRow}>
              <button type="button" className={a.linkBtn} onClick={leaveReset}>← Back to sign in</button>
            </div>
          </form>
        )}

        <p className={a.hint}>
          Access is provisioned for the Hbee team. If you are a client, use the <a href="/client-login">Client Portal sign in</a> instead.
        </p>
      </div>
    </AdminAuthShell>
  )
}
