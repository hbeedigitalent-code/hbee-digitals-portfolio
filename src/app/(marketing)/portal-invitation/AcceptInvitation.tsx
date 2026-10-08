'use client'

import { useState } from 'react'
import Link from 'next/link'

// The only interactive step: an authenticated POST. No ids are sent — the
// server reads the token from its httpOnly cookie and the identity from the session.

const MESSAGES: Record<string, string> = {
  expired: 'This invitation has expired. Contact us and we’ll send a new one.',
  invalid: 'This invitation link isn’t valid. Please open the link from your email again.',
  used: 'This invitation has already been used by another account.',
  email_mismatch: 'You’re signed in with a different email from the one this invitation was sent to.',
  email_unverified: 'Please confirm your email address first, then open your invitation link again.',
  no_client: 'Your account isn’t fully set up yet. Confirm your email, then open your invitation link again.',
  sign_in_required: 'Please sign in first.',
  client_ambiguous: 'We couldn’t connect this account automatically. Contact us and we’ll sort it out.',
  client_linked_elsewhere: 'This account is already connected to a different business. Contact us and we’ll sort it out.',
  merchant_linked_elsewhere: 'This business is already connected to a different account. Contact us and we’ll sort it out.',
  link_refused: 'We couldn’t connect this account automatically. Contact us and we’ll sort it out.',
}

export function AcceptInvitation({ className, secondaryClassName }: { className: string; secondaryClassName: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  if (state === 'done') {
    return (
      <div className="mt-6" role="status">
        <p className="text-white">Your account is connected.</p>
        <Link href="/client-portal" className={`${className} mt-4`}>Open your client portal</Link>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={state === 'busy'}
        onClick={async () => {
          setState('busy')
          try {
            const res = await fetch('/api/portal-invitation/accept', { method: 'POST' })
            const data = await res.json().catch(() => ({}))
            if (data?.ok) return setState('done')
            setMessage(MESSAGES[data?.reason] ?? 'Something went wrong. Please try again.')
            setState('error')
          } catch {
            setMessage('We couldn’t reach Hbee. Check your connection and try again.')
            setState('error')
          }
        }}
      >
        {state === 'busy' ? 'Connecting…' : 'Connect my account'}
      </button>
      {state === 'error' && (
        <div className="mt-4" role="alert">
          <p className="text-sm text-white">{message}</p>
          <Link href="/contact" className={`${secondaryClassName} mt-4`}>Contact Hbee</Link>
        </div>
      )}
    </div>
  )
}
