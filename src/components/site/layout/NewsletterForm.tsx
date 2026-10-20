'use client'

import { useCallback, useId, useRef, useState, type FormEvent } from 'react'
import TurnstileWidget from '@/components/ui/TurnstileWidget'
import { NEWSLETTER_CONSENT } from '@/lib/footer-settings'
import { subscribeNewsletter } from '@/lib/newsletter-client'
import { SiteButton } from '../primitives/SiteButton'
import styles from './newsletter.module.css'

export function NewsletterForm({ source }: { source: 'footer' | 'popup' }) {
  const id = useId(), busy = useRef(false)
  const [email, setEmail] = useState(''), [consent, setConsent] = useState(false)
  const [token, setToken] = useState(''), [challenge, setChallenge] = useState(0), [engaged, setEngaged] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'sending' | 'error' | 'success'>('idle'), [message, setMessage] = useState('')
  const verified = useCallback((value: string) => setToken(value), [])
  const resetToken = useCallback(() => setToken(''), [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current) return
    busy.current = true
    setPhase('sending'); setMessage('')
    try {
      const text = await subscribeNewsletter({ email, consent, token, source })
      setMessage(text); setPhase('success')
    } catch (error) {
      setMessage(error instanceof Error && error.message !== 'Failed to fetch' ? error.message : 'Subscription failed. Please try again.')
      setPhase('error') // preserve input and consent for a retry
      setToken(''); setChallenge(value => value + 1)
    } finally { busy.current = false }
  }
  if (phase === 'success') return <p className={styles.result} role="status">{message}</p>
  return <form className={styles.form} onSubmit={submit} onFocusCapture={() => setEngaged(true)} aria-busy={phase === 'sending'}>
    <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
    <div className={styles.inputRow}>
      <input id={`${id}-email`} type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} placeholder="Enter your email address" aria-describedby={`${id}-message`} disabled={phase === 'sending'} />
      <SiteButton type="submit" variant="conversion" disabled={phase === 'sending'}>{phase === 'sending' ? 'Subscribing…' : 'Subscribe'}</SiteButton>
    </div>
    <label className={styles.consent}><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} disabled={phase === 'sending'} /><span>{NEWSLETTER_CONSENT}</span></label>
    {engaged && <TurnstileWidget key={challenge} onVerify={verified} onExpire={resetToken} onError={resetToken} size="compact" theme={source === 'footer' ? 'dark' : 'light'} />}
    <p id={`${id}-message`} role={phase === 'error' ? 'alert' : 'status'} className={styles.message}>{message || 'No noise. Just useful growth thinking.'}</p>
  </form>
}
