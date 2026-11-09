// src/app/admin-2fa-challenge/TwoFactorChallengeForm.tsx
'use client'

import { useEffect, useState } from 'react'
import a from '@/components/admin/auth/admin-auth.module.css'

// Imports only the auth styles — nothing from src/app/admin/
// (no sidebar, header, nav, or dashboard data). This form has never depended
// on the admin shell; the shell-leak bug was the route's file-system
// nesting under admin/layout.tsx, fixed by this route living outside it.
//
// Two jobs, decided by the server (/api/admin/2fa/status), never by the browser:
//   1. code-required  — 2FA is enabled: collect the 6-digit code (/api/admin/2fa/login).
//   2. enroll         — 2FA is MANDATORY and this admin has not enrolled: set up an authenticator, prove one code
//                       (/api/admin/2fa/setup then /api/admin/2fa/verify). Only that proof issues the verified
//                       cookie, so nothing in the admin is reachable before it. No backup codes are shown here
//                       because nothing in the app accepts them yet; a lost authenticator is reset by an owner.

type Phase = 'checking' | 'code-required' | 'enroll-intro' | 'enroll-scan' | 'error'

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 6)

export default function TwoFactorChallengeForm({ next }: { next: string }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')

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
          // Only the explicit, temporary opt-out policy reaches here: the server stamped the verified cookie.
          // Hard-navigate so middleware re-evaluates this request with the fresh cookie present.
          window.location.href = next
          return
        }

        setPhase(result.enrollmentRequired ? 'enroll-intro' : 'code-required')
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

  async function handleStartEnrollment() {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/2fa/setup', { method: 'POST' })
      const result = await response.json()
      if (!response.ok || !result.success) {
        setError(result.error || 'Could not start setup. Please try again.')
        return
      }
      setQrCode(result.qrCode || '')
      setSecret(result.secret || '')
      setCode('')
      setPhase('enroll-scan')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmEnrollment() {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code }),
      })
      const result = await response.json()
      if (result.success) {
        // The server has enabled 2FA and issued the verified cookie.
        window.location.href = next
        return
      }
      setError(result.error || 'That code did not match. Check your authenticator and try again.')
    } catch {
      setError('Failed to verify the code. Please try again.')
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

  if (phase === 'enroll-intro') {
    return (
      <div className={a.card}>
        <p className={a.cardEyebrow}><span aria-hidden="true" className={a.node} />Two-step verification required</p>
        <h1 className={a.cardTitle}>Set up your authenticator</h1>
        <p className={a.cardText}>Administrator accounts must use two-step verification. You will scan a code with an authenticator app (such as Google Authenticator, 1Password or Authy), then confirm one 6-digit code. Nothing in Hbee Administration opens until this is done.</p>
        <div className={a.form}>
          {error && <p role="alert" className={a.error}>{error}</p>}
          <button type="button" onClick={handleStartEnrollment} disabled={submitting} className={a.submit}>
            {submitting && <span aria-hidden="true" className={a.spinner} />}
            {submitting ? 'Preparing…' : 'Set up authenticator'}
          </button>
          <div className={a.linkRow}><a href="/admin/login" className={a.linkBtn}>← Back to sign in</a></div>
        </div>
      </div>
    )
  }

  if (phase === 'enroll-scan') {
    return (
      <div className={a.card}>
        <p className={a.cardEyebrow}><span aria-hidden="true" className={a.node} />Two-step verification required</p>
        <h1 className={a.cardTitle}>Scan, then confirm</h1>
        <p className={a.cardText}>1. Scan this code with your authenticator app, or enter the key by hand. 2. Type the 6-digit code it shows.</p>
        <div className={a.form}>
          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="QR code to add Hbee Administration to your authenticator app" width={192} height={192} style={{ alignSelf: 'center', borderRadius: 12, border: '1px solid var(--hb-border-soft)', background: '#fff' }} />
          )}
          {secret && (
            <p className={a.hint} style={{ marginTop: 0, paddingTop: 0, border: 0, wordBreak: 'break-all', textAlign: 'center' }}>
              Manual key: <strong style={{ fontFamily: 'monospace' }}>{secret}</strong>
            </p>
          )}
          <div className={a.field}>
            <label htmlFor="admin-2fa-enroll-code" className={a.label}>6-digit code</label>
            <input
              id="admin-2fa-enroll-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(digitsOnly(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6 && !submitting) handleConfirmEnrollment() }}
              className={`${a.input} ${a.codeInput}`}
              placeholder="000000"
              maxLength={6}
              aria-invalid={Boolean(error)}
              autoFocus
            />
          </div>
          {error && <p role="alert" className={a.error}>{error}</p>}
          <button type="button" onClick={handleConfirmEnrollment} disabled={submitting || code.length !== 6} className={a.submit}>
            {submitting && <span aria-hidden="true" className={a.spinner} />}
            {submitting ? 'Confirming…' : 'Confirm and continue'}
          </button>
          <p className={a.hint} style={{ marginTop: 0 }}>If you lose this authenticator later, ask an Hbee owner to reset it; you will then enrol again.</p>
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
            onChange={(e) => setCode(digitsOnly(e.target.value))}
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
