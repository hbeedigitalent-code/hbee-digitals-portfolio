// src/app/admin/reset-password/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ADMIN_PASSWORD_MIN_LENGTH, adminPasswordError } from '@/lib/admin/password-policy'
import { AdminAuthShell } from '@/components/admin/auth/AdminAuthShell'
import a from '@/components/admin/auth/admin-auth.module.css'

/**
 * Admin password recovery, step 2 (the page the reset email links to).
 *
 * RECOVERY ONLY. This page cannot sign anyone in, create an account or provision an admin. It reuses the
 * mechanism the Client Portal already uses: Supabase sends a recovery link, the cookie-backed browser client
 * (@supabase/ssr, PKCE) exchanges the link's code for a short-lived recovery session, and the only thing this
 * page then does is supabase.auth.updateUser({ password }).
 *
 * HOW A LINK IS ACCEPTED. Only Supabase's own PASSWORD_RECOVERY event counts. An existing ordinary session is
 * never enough: an admin who is already signed in and opens an expired, used or foreign link must see "not
 * valid", not a password form. The event is captured at module load (below) so it cannot be missed if the
 * exchange finishes before React mounts.
 *
 * 2FA. Middleware and requireActiveAdmin() require the user-bound 2FA cookie for every other admin page and API,
 * so a recovery session alone reaches nothing for an admin who has 2FA enabled. To be sure a cookie left in the
 * browser by an EARLIER session cannot stand in for the TOTP step, the 2FA cookie is cleared the moment the link
 * is accepted and again after the password changes. Afterwards the recovery session is signed out (globally,
 * which also ends the user's other sessions) and the person returns to /admin/login, so a new password never
 * skips normal sign-in or 2FA.
 *
 * The URL is read once, at module load, because the Supabase client removes ?code= from the address bar as soon
 * as it has exchanged it.
 */

const WAIT_FOR_LINK_MS = 8000

type LinkState = 'checking' | 'ready' | 'invalid'

function readLink() {
  if (typeof window === 'undefined') return { hasRecoveryMarker: false, hasError: false }
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const hasError = ['error', 'error_code', 'error_description'].some((k) => query.has(k) || hash.has(k))
  const hasRecoveryMarker = query.has('code') || query.has('token_hash') || hash.get('type') === 'recovery' || hash.has('access_token')
  return { hasRecoveryMarker, hasError }
}
const INITIAL_LINK = readLink()

// Module-level listener: registered synchronously at import, before any network exchange can complete.
let recoveryConfirmed = false
const recoveryListeners = new Set<() => void>()
if (typeof window !== 'undefined' && INITIAL_LINK.hasRecoveryMarker && !INITIAL_LINK.hasError) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryConfirmed = true
      recoveryListeners.forEach((listener) => listener())
    }
  })
}

/** Drops any "2FA verified" cookie already in this browser (httpOnly, so only the server can). Best effort. */
async function clearTwoFactorCookie() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' })
  } catch {
    /* non-fatal: the recovery session is still not an admin session without a valid cookie */
  }
}

export default function AdminResetPasswordPage() {
  const [link, setLink] = useState<LinkState>(INITIAL_LINK.hasError || !INITIAL_LINK.hasRecoveryMarker ? 'invalid' : 'checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (INITIAL_LINK.hasError || !INITIAL_LINK.hasRecoveryMarker) return

    const accept = () => {
      void clearTwoFactorCookie()
      setLink('ready')
    }
    if (recoveryConfirmed) accept()
    else recoveryListeners.add(accept)

    const timer = window.setTimeout(() => {
      if (!recoveryConfirmed) setLink('invalid')
    }, WAIT_FOR_LINK_MS)

    return () => {
      recoveryListeners.delete(accept)
      window.clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const policyError = adminPasswordError(password)
    if (policyError) {
      setError(policyError)
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      // End the recovery session everywhere and drop any 2FA cookie: the next step is a normal sign-in.
      await clearTwoFactorCookie()
      await supabase.auth.signOut()
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not update the password. Request a new reset link and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminAuthShell>
      <div className={a.card}>
        <p className={a.cardEyebrow}><span aria-hidden="true" className={a.node} />Password recovery</p>

        {done ? (
          <>
            <h1 className={a.cardTitle}>Password updated</h1>
            <p role="status" className={a.success}><strong>You are all set</strong>Sign in with your new password. You will be asked for your verification code if two-factor authentication is on for your account.</p>
            <div className={a.form}>
              <Link href="/admin/login" className={a.submit}>Continue to sign in</Link>
            </div>
          </>
        ) : link === 'checking' ? (
          <>
            <h1 className={a.cardTitle}>Checking your reset link</h1>
            <p role="status" className={a.cardText}><span aria-hidden="true" className={a.spinner} /> One moment…</p>
          </>
        ) : link === 'invalid' ? (
          <>
            <h1 className={a.cardTitle}>This reset link is not valid</h1>
            <p className={a.cardText}>The link may have expired, been used already, or been opened in a different browser from the one that requested it. Reset links work once and expire quickly.</p>
            <div className={a.form}>
              <Link href="/admin/login?reset=1" className={a.submit}>Request a new link</Link>
              <div className={a.linkRow}><Link href="/admin/login" className={a.linkBtn}>← Back to sign in</Link></div>
            </div>
          </>
        ) : (
          <>
            <h1 className={a.cardTitle}>Choose a new password</h1>
            <p className={a.cardText}>Enter a new password for your Hbee team account. Use at least {ADMIN_PASSWORD_MIN_LENGTH} characters; a few unrelated words make a strong, memorable password.</p>
            <form onSubmit={handleSubmit} className={a.form}>
              <div className={a.field}>
                <label htmlFor="admin-new-password" className={a.label}>New password</label>
                <div className={a.inputWrap}>
                  <input id="admin-new-password" name="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${a.input} ${a.inputWithToggle}`} placeholder={`At least ${ADMIN_PASSWORD_MIN_LENGTH} characters`} required minLength={ADMIN_PASSWORD_MIN_LENGTH} aria-invalid={Boolean(error)} />
                  <button type="button" className={a.toggle} onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide passwords' : 'Show passwords'} aria-pressed={show}>
                    {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className={a.field}>
                <label htmlFor="admin-confirm-password" className={a.label}>Confirm new password</label>
                <input id="admin-confirm-password" name="confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={a.input} placeholder="Repeat the password" required aria-invalid={Boolean(error)} />
              </div>
              {error && <p role="alert" className={a.error}>{error}</p>}
              <button type="submit" disabled={saving} className={a.submit}>
                {saving && <span aria-hidden="true" className={a.spinner} />}
                {saving ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}

        <p className={a.hint}>Access is provisioned for the Hbee team. This page only changes the password of an existing account.</p>
      </div>
    </AdminAuthShell>
  )
}
