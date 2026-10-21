'use client'

import { useState, type FormEvent } from 'react'
import { CircleAlert, CircleCheck, MailMinus, SearchX, ShieldX } from 'lucide-react'
import { HbeeLogo } from '@/components/site/brand/HbeeLogo'
import { HbeeModuleGlyph } from '@/components/site/module/HbeeModule'
import { SiteButton } from '@/components/site/primitives/SiteButton'
import styles from './unsubscribe-experience.module.css'

export type UnsubscribeState = 'confirmation' | 'unsubscribed' | 'already_unsubscribed' | 'not_found' | 'invalid_link' | 'server_failure'

const CONTENT: Record<Exclude<UnsubscribeState, 'confirmation'>, { title: string; copy: string }> = {
  unsubscribed: {
    title: 'You’re unsubscribed.',
    copy: 'You won’t receive future Hbee Digitals newsletter emails at this address.',
  },
  already_unsubscribed: {
    title: 'You’re already unsubscribed.',
    copy: 'No further change was needed. This address is already removed from Hbee Digitals newsletter updates.',
  },
  not_found: {
    title: 'We couldn’t find this subscription.',
    copy: 'No newsletter subscription matches this link. If you still receive an email from us, please use its unsubscribe link or contact us.',
  },
  invalid_link: {
    title: 'This unsubscribe link isn’t valid.',
    copy: 'Please use the unsubscribe link from your most recent Hbee Digitals newsletter or contact us for help.',
  },
  server_failure: {
    title: 'We couldn’t complete your request.',
    copy: 'You have not been unsubscribed. Please try again, or contact Hbee Digitals if the problem continues.',
  },
}

function StateIcon({ state }: { state: UnsubscribeState }) {
  if (state === 'unsubscribed') return <CircleCheck aria-hidden="true" />
  if (state === 'invalid_link') return <ShieldX aria-hidden="true" />
  if (state === 'not_found') return <SearchX aria-hidden="true" />
  if (state === 'server_failure') return <CircleAlert aria-hidden="true" />
  return <MailMinus aria-hidden="true" />
}

export function UnsubscribeExperience({ initialState, email, signature }: {
  initialState: UnsubscribeState
  email?: string
  signature?: string
}) {
  const [state, setState] = useState(initialState)
  const [pending, setPending] = useState(false)

  async function unsubscribe(event?: FormEvent) {
    event?.preventDefault()
    if (pending || !email || !signature) return
    setPending(true)
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, signature }),
      })
      const result = await response.json().catch(() => null)
      const next = result?.state
      if (response.ok && (next === 'unsubscribed' || next === 'already_unsubscribed')) setState(next)
      else if (!response.ok && (next === 'not_found' || next === 'invalid_link')) setState(next)
      else setState('server_failure')
    } catch {
      setState('server_failure')
    } finally {
      setPending(false)
    }
  }

  const confirmation = state === 'confirmation'
  const content = confirmation ? {
    title: 'Leave the Hbee Digitals newsletter?',
    copy: 'You’ll stop receiving Hbee Digitals insights and updates at this email address.',
  } : CONTENT[state]
  const semanticRole = state === 'server_failure' || state === 'invalid_link' || state === 'not_found' ? 'alert' : 'status'

  return <main id="main-content" className={styles.page} data-tone="night">
    <div className={styles.ambient} aria-hidden="true" />
    <header className={styles.header}><HbeeLogo onDark priority /></header>
    <div className={styles.connector} aria-hidden="true"><span /><i /></div>
    <section className={styles.card} aria-labelledby="unsubscribe-title" role={confirmation ? undefined : semanticRole} aria-live={confirmation ? undefined : 'polite'}>
      <div className={styles.module}><HbeeModuleGlyph signal={state === 'unsubscribed' ? 'signal' : 'quiet'} size={54} /></div>
      <div className={styles.icon} data-state={state}><StateIcon state={state} /></div>
      <p className={styles.eyebrow}>Newsletter preferences</p>
      <h1 id="unsubscribe-title">{content.title}</h1>
      <p className={styles.copy}>{content.copy}</p>

      {confirmation ? <form className={styles.actions} onSubmit={unsubscribe}>
        <SiteButton type="submit" variant="conversion" size="lg" disabled={pending}>{pending ? 'Unsubscribing…' : 'Unsubscribe me'}</SiteButton>
        <SiteButton href="/" variant="secondary" size="lg">Keep me subscribed</SiteButton>
      </form> : <div className={styles.actions}>
        {state === 'server_failure' && email && signature && <SiteButton type="button" variant="conversion" size="lg" onClick={() => void unsubscribe()} disabled={pending}>{pending ? 'Trying again…' : 'Try again'}</SiteButton>}
        <SiteButton href="/" variant={state === 'server_failure' ? 'secondary' : 'brand'} size="lg">Return to Hbee Digitals</SiteButton>
      </div>}

      <p className={styles.help}>Need help? <a href="mailto:hello@hbeedigitals.com">Contact Hbee Digitals</a></p>
    </section>
    <p className={styles.footer}>Connected growth in motion.</p>
  </main>
}
