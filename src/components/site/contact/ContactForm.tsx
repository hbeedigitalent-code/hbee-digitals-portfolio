'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/cn'
import TurnstileWidget from '@/components/ui/TurnstileWidget'
import {
  BUDGETS,
  ENQUIRY_MESSAGES,
  ENQUIRY_TYPES,
  TIMELINES,
  enquiryFieldError,
  type EnquiryField,
  type EnquiryInput,
} from '@/lib/contact/enquiry'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import gr from '../growth-review/growth-review.module.css'
import styles from './contact.module.css'

/**
 * The Contact enquiry form (Phase 17). Posts to the existing hardened
 * POST /api/contact as form_type 'enquiry' — rate limit, Turnstile, allow-list
 * validation, storage, then the acknowledgement + internal notification.
 *
 * Optional budget/timeline have NO default. Errors never expose server,
 * Turnstile or network detail. On success the card becomes an in-page
 * confirmation; it does not push the visitor into a Growth Review.
 */

const EMPTY: EnquiryInput = { name: '', email: '', company: '', website: '', enquiryType: '', budget: '', timeline: '', message: '' }
const REQUIRED: EnquiryField[] = ['name', 'email', 'enquiryType', 'message']
const ORDER: EnquiryField[] = ['name', 'email', 'company', 'website', 'enquiryType', 'budget', 'timeline', 'message']
const fid = (f: EnquiryField) => `contact-${f}`

function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function ContactForm({ supportEmail }: { supportEmail: string | null }) {
  const [v, setV] = useState<EnquiryInput>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<EnquiryField, string>>>({})
  const [phase, setPhase] = useState<'idle' | 'sending' | 'done'>('idle')
  const [failure, setFailure] = useState(false)
  const [turnstile, setTurnstile] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [turnstileError, setTurnstileError] = useState(false)
  const dirty = useRef(new Set<EnquiryField>())
  const inFlight = useRef(false)
  // One key per set of answers: a retry of the same answers reuses it (no duplicate acknowledgement).
  const attempt = useRef<{ key: string; snapshot: string } | null>(null)
  const successRef = useRef<HTMLHeadingElement>(null)
  const failureRef = useRef<HTMLDivElement>(null)
  const turnstileBox = useRef<HTMLDivElement>(null)
  const recovered = useRef(false)

  // STABLE callbacks: the shared TurnstileWidget's setup effect depends on onError, so an
  // inline function would re-run it on every render and remove the rendered challenge.
  const onTurnstileVerify = useCallback((t: string) => {
    setTurnstile(t)
    setTurnstileError(false)
  }, [])
  const onTurnstileReset = useCallback(() => setTurnstile(null), [])

  // One-time recovery: if the Turnstile script is ready but no challenge was drawn (React
  // Strict Mode's double mount in development; or a load race), remount the widget once.
  useEffect(() => {
    if (phase === 'done' || recovered.current) return
    let tries = 0
    const t = window.setInterval(() => {
      tries++
      const ready = typeof window !== 'undefined' && Boolean((window as { turnstile?: unknown }).turnstile)
      // Drawn = Cloudflare has put anything into the widget's host element (its content may
      // sit in a shadow root, so an iframe is not reliably visible here), or a token exists.
      const host = turnstileBox.current?.querySelector(':scope > div > div')
      const drawn = Boolean(host?.childElementCount) || Boolean(turnstileBox.current?.querySelector('iframe'))
      if (drawn || tries > 20) return window.clearInterval(t)
      if (ready && tries >= 4) {
        recovered.current = true
        setTurnstileKey((k) => k + 1)
        window.clearInterval(t)
      }
    }, 500)
    return () => window.clearInterval(t)
  }, [turnstileKey, phase])

  useEffect(() => {
    if (phase !== 'done') return
    successRef.current?.focus()
    // Only after the server has confirmed the send: hide the Growth Review alternatives
    // around the confirmation (see .page[data-sent] .hideOnSent in contact.module.css).
    document.querySelector('[data-contact-page]')?.setAttribute('data-sent', '')
  }, [phase])

  const set = (f: EnquiryField, value: string) => {
    dirty.current.add(f)
    const next = { ...v, [f]: value }
    setV(next)
    if (errors[f]) {
      const msg = enquiryFieldError(f, next)
      setErrors((e) => {
        const c = { ...e }
        if (msg) c[f] = msg
        else delete c[f]
        return c
      })
    }
  }
  const blur = (f: EnquiryField) => {
    if (!dirty.current.has(f)) return
    const msg = enquiryFieldError(f, v)
    setErrors((e) => {
      const c = { ...e }
      if (msg) c[f] = msg
      else delete c[f]
      return c
    })
  }

  const submit = async () => {
    if (inFlight.current) return
    const found: Partial<Record<EnquiryField, string>> = {}
    for (const f of ORDER) {
      const msg = enquiryFieldError(f, v)
      if (msg) found[f] = msg
    }
    setErrors(found)
    const first = ORDER.find((f) => found[f])
    if (first) {
      document.getElementById(fid(first))?.focus()
      return
    }
    if (!turnstile) {
      setTurnstileError(true)
      return
    }

    const snapshot = JSON.stringify(v)
    if (!attempt.current || attempt.current.snapshot !== snapshot) attempt.current = { key: newKey(), snapshot }

    inFlight.current = true
    setPhase('sending')
    setFailure(false)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_type: 'enquiry',
          name: v.name.trim(),
          email: v.email.trim(),
          company: v.company.trim(),
          website: v.website.trim(),
          enquiry_type: v.enquiryType,
          // Optional answers are sent only when chosen.
          ...(v.budget ? { budget: v.budget } : {}),
          ...(v.timeline ? { timeline: v.timeline } : {}),
          message: v.message.trim(),
          turnstile_token: turnstile,
          submission_key: attempt.current.key,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.success) {
        setPhase('done')
        return
      }
      throw new Error('rejected')
    } catch {
      setFailure(true)
      setPhase('idle')
      // A Turnstile token is single-use: always start a fresh challenge.
      setTurnstile(null)
      setTurnstileKey((k) => k + 1)
      requestAnimationFrame(() => failureRef.current?.focus())
    } finally {
      inFlight.current = false
    }
  }

  if (phase === 'done') {
    return (
      <div className={styles.success} data-state="sent">
        <p className={gr.receivedStatus}>
          <span aria-hidden="true" className={gr.receivedStatusNode} />
          Message received
        </p>
        <h2 ref={successRef} tabIndex={-1} className={styles.successTitle}>
          Thanks — your message is with us.
        </h2>
        <p className={styles.successBody}>
          We’ve received your request and are reviewing the details you shared. You can typically expect a response from
          the Hbee team within 12–24 hours.
        </p>
        <h3 className={styles.nextTitle}>What happens next</h3>
        <ol className={styles.nextList}>
          <li className={styles.nextItem}>
            <span aria-hidden="true" className={styles.nextNum}>01</span>
            <div>
              <p className={styles.nextName}>We review your request</p>
              <p className={styles.nextText}>We look through the context you provided and determine the most useful next step.</p>
            </div>
          </li>
          <li className={styles.nextItem}>
            <span aria-hidden="true" className={styles.nextNum}>02</span>
            <div>
              <p className={styles.nextName}>We continue by email</p>
              <p className={styles.nextText}>
                If we need anything else before responding properly, we’ll ask. Otherwise, you’ll hear from us by email.
              </p>
            </div>
          </li>
        </ol>
        <div className={styles.clientCard}>
          <p className={styles.clientTitle}>Already a client?</p>
          <p className={styles.clientText}>Continue your project or conversation through your Client Portal.</p>
          <SiteLinkArrow href="/client-login" className="mt-1 min-h-[44px]">
            Go to Client Portal
          </SiteLinkArrow>
        </div>
        <div className={styles.successLinks}>
          <SiteLinkArrow href="/" className="min-h-[44px]">
            Return home
          </SiteLinkArrow>
        </div>
      </div>
    )
  }

  const describedBy = (f: EnquiryField, helper?: boolean) =>
    [helper ? `${fid(f)}-help` : '', errors[f] ? `${fid(f)}-error` : ''].filter(Boolean).join(' ') || undefined

  const err = (f: EnquiryField) =>
    errors[f] ? (
      <p id={`${fid(f)}-error`} className={gr.error}>
        <span aria-hidden="true" className={gr.errorMark}>!</span>
        {errors[f]}
      </p>
    ) : null

  const label = (f: EnquiryField, children: ReactNode, optional?: boolean) => (
    <label htmlFor={fid(f)} className={gr.label}>
      {children}
      {REQUIRED.includes(f) && (
        <>
          {' '}
          <span aria-hidden="true" className={gr.req}>*</span>
        </>
      )}
      {optional && <span className={styles.optional}> (Optional)</span>}
    </label>
  )

  const text = (f: EnquiryField, labelText: string, o: { type?: string; auto?: string; mode?: 'email' | 'url' | 'text'; placeholder?: string; helper?: string; optional?: boolean } = {}) => (
    <div className={gr.field}>
      {label(f, labelText, o.optional)}
      <input
        id={fid(f)}
        name={f}
        type={o.type ?? 'text'}
        inputMode={o.mode}
        autoComplete={o.auto}
        placeholder={o.placeholder}
        value={v[f]}
        onChange={(e) => set(f, e.target.value)}
        onBlur={() => blur(f)}
        aria-required={REQUIRED.includes(f) || undefined}
        aria-invalid={errors[f] ? true : undefined}
        aria-describedby={describedBy(f, Boolean(o.helper))}
        className={cn(gr.input, errors[f] && gr.inputInvalid)}
      />
      {o.helper && <p id={`${fid(f)}-help`} className={gr.helper}>{o.helper}</p>}
      {err(f)}
    </div>
  )

  const select = (f: EnquiryField, labelText: string, options: readonly string[], placeholder: string, o: { optional?: boolean; helper?: string; full?: boolean } = {}) => (
    <div className={cn(gr.field, o.full && styles.full)}>
      {label(f, labelText, o.optional)}
      <select
        id={fid(f)}
        name={f}
        value={v[f]}
        onChange={(e) => set(f, e.target.value)}
        onBlur={() => blur(f)}
        aria-required={REQUIRED.includes(f) || undefined}
        aria-invalid={errors[f] ? true : undefined}
        aria-describedby={describedBy(f, Boolean(o.helper))}
        className={cn(gr.input, gr.select, errors[f] && gr.inputInvalid)}
      >
        {/* No default: the placeholder is the empty value and stays selectable. */}
        <option value="">{placeholder}</option>
        {options.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
      {o.helper && <p id={`${fid(f)}-help`} className={gr.helper}>{o.helper}</p>}
      {err(f)}
    </div>
  )

  return (
    <form
      noValidate
      aria-labelledby="contact-form-title"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h2 id="contact-form-title" className={styles.formTitle}>Tell us a little about it.</h2>
      <p className={styles.formIntro}>
        Share the context that will help us understand your request. You don’t need to have everything figured out before
        reaching out.
      </p>

      <div className={styles.fields}>
        {text('name', 'Your name', { auto: 'name', placeholder: 'e.g. Alex Morgan' })}
        {text('email', 'Email address', { type: 'email', mode: 'email', auto: 'email', placeholder: 'you@company.com' })}
        {text('company', 'Business / Company', { auto: 'organization', placeholder: 'Your business name', optional: true })}
        {text('website', 'Website / Store', { mode: 'url', auto: 'url', placeholder: 'yourstore.com', helper: 'Your website, online store or main selling page.', optional: true })}
        {select('enquiryType', 'What are you reaching out about?', ENQUIRY_TYPES, 'Select an option', { full: true })}
        {select('budget', 'Estimated budget', BUDGETS, 'Select a range', { optional: true, helper: 'Optional — this simply helps us understand the likely scope.' })}
        {select('timeline', 'When would you like to get started?', TIMELINES, 'Select a timeline', { optional: true })}
        <div className={cn(gr.field, styles.full)}>
          {label('message', 'Tell us what you need')}
          <textarea
            id={fid('message')}
            name="message"
            rows={6}
            placeholder="A little context goes a long way — what are you trying to achieve, what are you working with now, and where would you like Hbee to help?"
            value={v.message}
            onChange={(e) => set('message', e.target.value)}
            onBlur={() => blur('message')}
            aria-required
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy('message')}
            className={cn(gr.input, gr.textarea, errors.message && gr.inputInvalid)}
          />
          {err('message')}
        </div>
      </div>

      <div ref={turnstileBox} className={styles.turnstile}>
        <TurnstileWidget
          key={turnstileKey}
          onVerify={onTurnstileVerify}
          onExpire={onTurnstileReset}
          onError={onTurnstileReset}
        />
        {turnstileError && (
          <p className={gr.error} role="alert">
            <span aria-hidden="true" className={gr.errorMark}>!</span>
            Please complete the security check.
          </p>
        )}
      </div>

      {failure && (
        <div ref={failureRef} tabIndex={-1} role="alert" className={cn(gr.status, gr.statusError)}>
          <p>
            <span aria-hidden="true" className={gr.errorMark}>!</span>
            {ENQUIRY_MESSAGES.failure}
          </p>
          {supportEmail && (
            <p>
              If the problem continues, you can email us directly at{' '}
              <a className={gr.inlineLink} href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </p>
          )}
        </div>
      )}

      <div className={styles.submitRow}>
        <SiteButton type="submit" variant="conversion" size="lg" arrow={phase !== 'sending'} className={styles.submit} disabled={phase === 'sending'}>
          {phase === 'sending' ? (
            <span className={gr.busy}>
              <span aria-hidden="true" className={gr.spinner} />
              Sending…
            </span>
          ) : (
            'Send message'
          )}
        </SiteButton>
        <p className={styles.privacyNote}>
          <Lock aria-hidden="true" className={styles.lock} />
          Your message goes directly to the Hbee team. We typically respond within 12–24 hours.
        </p>
      </div>
    </form>
  )
}
