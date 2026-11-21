'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/cn'
import { trackGrowthReviewRequestStarted, trackGrowthReviewRequestSubmitted } from '@/lib/analytics'
import TurnstileWidget from '@/components/ui/TurnstileWidget'
import { SiteButton } from '../primitives/SiteButton'
import { RECEIPT_KEY, newSubmissionKey } from './form-model'
import {
  ATTRIBUTION_STORAGE_KEY,
  EMPTY_QUICK,
  QUICK_COPY,
  QUICK_FIELDS,
  QUICK_MSG,
  QUICK_RECEIPT_KIND,
  QUICK_SUBMIT_URL,
  buildQuickPayload,
  resolveAttribution,
  validateQuick,
  validateQuickField,
  type QuickAnswers,
  type QuickAttribution,
  type QuickField,
} from './quick-form-model'
import styles from './growth-review.module.css'

const RECEIVED_PATH = '/growth-review/received'

type Errors = Partial<Record<QuickField, string>>

const fid = (f: QuickField) => `gr-quick-${f}`
const eid = (f: QuickField) => `gr-quick-${f}-error`

/**
 * The short Free Growth Review form: store URL, email, biggest challenge.
 * A LEAD form — it posts to /api/growth-review-request and never to the scored
 * assessment. `location` says where on the page it sits (analytics only).
 */
export function GrowthReviewQuickForm({ location = 'hero', idPrefix = 'hero' }: { location?: string; idPrefix?: string }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<QuickAnswers>(EMPTY_QUICK)
  const [errors, setErrors] = useState<Errors>({})
  const [turnstile, setTurnstile] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const attribution = useRef<QuickAttribution>({})
  const submissionKey = useRef<string | null>(null)
  const inFlight = useRef(false)
  const started = useRef(false)
  const alertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    attribution.current = resolveAttribution(window.location.search, document.referrer, window.location.hostname, {
      get: () => window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY),
      set: (v) => window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, v),
    })
  }, [])

  const analyticsContext = () => ({
    utm_source: attribution.current.utm_source,
    utm_medium: attribution.current.utm_medium,
    utm_campaign: attribution.current.utm_campaign,
    utm_content: attribution.current.utm_content,
    cta_location: location,
  })

  const markStarted = () => {
    if (started.current) return
    started.current = true
    trackGrowthReviewRequestStarted(analyticsContext())
  }

  const update = (field: keyof QuickAnswers, value: string) => {
    markStarted()
    submissionKey.current = null // changed answers get a fresh reference
    setAnswers((a) => ({ ...a, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validateQuickField(field, { ...answers, [field]: value }, turnstile) ?? undefined }))
  }

  const blur = (field: keyof QuickAnswers) => {
    if (!answers[field]) return
    setErrors((e) => ({ ...e, [field]: validateQuickField(field, answers, turnstile) ?? undefined }))
  }

  const onTurnstile = useCallback((token: string) => {
    setTurnstile(token)
    setErrors((e) => ({ ...e, turnstile: undefined }))
  }, [])
  const clearTurnstile = useCallback(() => setTurnstile(null), [])
  const resetTurnstile = () => {
    setTurnstile(null)
    setTurnstileKey((k) => k + 1)
  }

  const fail = (message: string) => {
    inFlight.current = false
    setBusy(false)
    setSubmitError(message)
    resetTurnstile()
    window.setTimeout(() => alertRef.current?.focus(), 0)
  }

  const submit = async () => {
    if (inFlight.current) return
    const found = validateQuick(answers, turnstile)
    if (Object.keys(found).length) {
      setErrors(found)
      const first = QUICK_FIELDS.find((f) => found[f])
      if (first) window.setTimeout(() => document.getElementById(`${idPrefix}-${fid(first)}`)?.focus(), 0)
      return
    }

    if (!submissionKey.current) submissionKey.current = newSubmissionKey()
    const key = submissionKey.current
    inFlight.current = true
    setSubmitError(null)
    setBusy(true)

    try {
      const res = await fetch(QUICK_SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildQuickPayload(answers, attribution.current, location),
          hb_extra: '',
          turnstile_token: turnstile,
          submission_key: key,
        }),
      })
      const json = await res.json().catch(() => null)

      if (res.ok && json?.success === true) {
        trackGrowthReviewRequestSubmitted({ responseOk: res.ok, success: json.success, duplicate: json.duplicate }, key, analyticsContext())
        try {
          window.sessionStorage.setItem(RECEIPT_KEY, JSON.stringify({ at: Date.now(), kind: QUICK_RECEIPT_KIND }))
        } catch {
          /* the confirmation page falls back to its neutral state */
        }
        router.push(RECEIVED_PATH)
        return
      }
      if (res.status === 429) return fail(QUICK_MSG.rateLimit)
      if (res.status === 400 && json && typeof json === 'object' && 'retryable' in json) return fail(QUICK_MSG.turnstile)
      if (res.status === 400) return fail(typeof json?.error === 'string' ? json.error : QUICK_MSG.rejected)
      return fail(QUICK_MSG.server)
    } catch {
      return fail(QUICK_MSG.offline)
    }
  }

  const field = (
    name: keyof QuickAnswers,
    label: string,
    input: (common: Record<string, unknown>) => JSX.Element,
  ) => {
    const id = `${idPrefix}-${fid(name)}`
    return (
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {input({
          id,
          'aria-required': true,
          'aria-invalid': errors[name] ? true : undefined,
          'aria-describedby': errors[name] ? `${idPrefix}-${eid(name)}` : undefined,
          className: cn(styles.input, errors[name] && styles.inputInvalid),
          value: answers[name],
          onChange: (e: { target: { value: string } }) => update(name, e.target.value),
          onBlur: () => blur(name),
        })}
        {errors[name] && (
          <p id={`${idPrefix}-${eid(name)}`} className={styles.error}>
            <span aria-hidden="true" className={styles.errorMark}>!</span>
            {errors[name]}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      noValidate
      className={styles.quickCard}
      aria-label="Free Growth Review request"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <span aria-hidden="true" className={styles.cardRoute} />

      {field('website', QUICK_COPY.urlLabel, (c) => (
        <input {...c} type="text" inputMode="url" autoComplete="url" placeholder={QUICK_COPY.urlPlaceholder} spellCheck={false} autoCapitalize="none" />
      ))}
      {field('email', QUICK_COPY.emailLabel, (c) => (
        <input {...c} type="email" autoComplete="email" placeholder={QUICK_COPY.emailPlaceholder} spellCheck={false} autoCapitalize="none" />
      ))}
      {field('biggest_challenge', QUICK_COPY.challengeLabel, (c) => (
        <textarea {...c} rows={3} maxLength={1000} placeholder={QUICK_COPY.challengePlaceholder} className={cn(c.className as string, styles.quickTextarea)} />
      ))}

      {/* Honeypot: hidden from people and assistive tech, left empty by real browsers. */}
      <div aria-hidden="true" className={styles.honeypot}>
        <label>
          Leave this field empty
          <input type="text" name="hb_extra" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className={styles.turnstile} aria-describedby={errors.turnstile ? `${idPrefix}-${eid('turnstile')}` : undefined}>
        <TurnstileWidget key={turnstileKey} onVerify={onTurnstile} onExpire={clearTurnstile} onError={clearTurnstile} />
        {errors.turnstile && (
          <p id={`${idPrefix}-${eid('turnstile')}`} className={styles.error}>
            <span aria-hidden="true" className={styles.errorMark}>!</span>
            {errors.turnstile}
          </p>
        )}
      </div>

      {submitError && (
        <div ref={alertRef} tabIndex={-1} className={cn(styles.status, styles.statusError)}>
          <p role="alert">
            <span aria-hidden="true" className={styles.errorMark}>!</span>
            {submitError}
          </p>
        </div>
      )}

      <SiteButton type="submit" variant="conversion" size="lg" arrow={!busy} disabled={busy} aria-disabled={busy || undefined} className={styles.quickSubmit}>
        {busy ? (
          <span className={styles.busy}>
            <span aria-hidden="true" className={styles.spinner} />
            {QUICK_COPY.busy}
          </span>
        ) : (
          QUICK_COPY.cta
        )}
      </SiteButton>
      <p className={styles.quickNote}>
        {QUICK_COPY.timeNote} {QUICK_COPY.privacy}{' '}
        <a href="/privacy" className={styles.inlineLink}>
          Privacy Policy
        </a>
        .
      </p>
    </form>
  )
}
