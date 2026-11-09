// src/app/admin-2fa-challenge/TwoFactorChallengeForm.tsx
'use client'

import { useEffect, useState } from 'react'
import a from '@/components/admin/auth/admin-auth.module.css'

// Imports only the auth styles — nothing from src/app/admin/
// (no sidebar, header, nav, or dashboard data). This form has never depended
// on the admin shell; the shell-leak bug was the route's file-system
// nesting under admin/layout.tsx, fixed by this route living outside it.

type Phase = 'checking' | 'code-required' | 'error'

export default function TwoFactorChallengeForm({ next }: { next: string }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      try {
        const response = await fetch('/api/admin/2fa/status', { method: 'GET' })
        const result = await response.json()

        if (cancelled) return

        if (!response.ok) {
          setError(result.error || 'Unable to verify your account status.')
          setPhase('error')
          return
        }

        if (result.ready) {
          // 2FA is not enabled for this account — the server already stamped
          // the verified cookie. Hard-navigate so middleware re-evaluates
          // this request with the fresh cookie present.
          window.location.href = next
          return
        }

        // 2FA is enabled — collect the code.
        setPhase('code-required')
      } catch {
        if (!cancelled) {
          setError('Unable to reach the server. Please try again.')
          setPhase('error')
        }
      }
    }

    checkStatus()
    return () => {
      cancelled = true
    }
  }, [next])

  async function handleVerify() {
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/admin/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      })

      const result = await response.json()

      if (result.success) {
        window.location.href = next
        return
      }

      setError(result.error || 'Invalid verification code.')
    } catch {
      setError('Failed to verify code. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'checking') {
    return (
      <div className={a.card} role="status">
        <p className={a.cardEyebrow}><span aria-hidden="true" className={a.node} />Verification</p>
        <h1 className={a.cardTitle}>Checking your account</h1>
        <p className={a.cardText}>One moment while we confirm your sign-in.</p>
        <div className={a.form}><span aria-hidden="true" className={a.spinner} style={{ width: '1.75rem', height: '1.75rem', color: 'var(--hb-blue)' }} /></div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className={a.card}>
        <p className={a.cardEyebrow}><span aria-hidden="true" className={a.node} />Verification</p>
        <h1 className={a.cardTitle}>We could not verify your account</h1>
        <div className={a.form}>
          <p role="alert" className={a.error}>{error}</p>
          <div className={a.linkRow}><a href="/admin/login" className={a.linkBtn}>← Back to sign in</a></div>
        </div>
      </div>
    )
  }

  return (
    <div className={a.card}>
      <p className={a.cardEyebrow}><span aria-hidden="true" className={a.node} />Two-step verification</p>
      <h1 className={a.cardTitle}>Enter your authentication code</h1>
      <p className={a.cardText}>Open your authenticator app and enter the 6-digit code for Hbee Administration.</p>

      <div className={a.form}>
        <div className={a.field}>
          <label htmlFor="admin-2fa-code" className={a.label}>Authentication code</label>
          <input
            id="admin-2fa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6 && !submitting) handleVerify()
            }}
            className={`${a.input} ${a.codeInput}`}
            placeholder="000000"
            maxLength={6}
            aria-invalid={Boolean(error)}
            autoFocus
          />
        </div>

        {error && <p role="alert" className={a.error}>{error}</p>}

        <button type="button" onClick={handleVerify} disabled={submitting || code.length !== 6} className={a.submit}>
          {submitting && <span aria-hidden="true" className={a.spinner} />}
          {submitting ? 'Verifying…' : 'Verify and continue'}
        </button>

        <div className={a.linkRow}><a href="/admin/login" className={a.linkBtn}>← Back to sign in</a></div>
      </div>
    </div>
  )
}
