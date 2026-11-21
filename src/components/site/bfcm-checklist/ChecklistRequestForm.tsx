'use client'

import { useCallback, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { trackChecklistEvent, trackChecklistRequested } from '@/lib/analytics'
import TurnstileWidget from '@/components/ui/TurnstileWidget'
import { SiteButton, siteButtonClasses } from '../primitives/SiteButton'
import { newSubmissionKey } from '../growth-review/form-model'
import { CHECKLIST_PDF_FILENAME, CHECKLIST_PDF_PATH, CL_FORM, CL_MSG, CL_READY } from './checklist-content'
import {
  CHECKLIST_SUBMIT_URL,
  buildRequestPayload,
  validateRequest,
  validateRequestField,
  type RequestAnswers,
  type RequestField,
} from './checklist-model'
import { ChecklistGrowthReviewLink } from './ChecklistGrowthReviewLink'
import { analyticsContext, useChecklistAttribution } from './useChecklistAttribution'
import growthStyles from '../growth-review/growth-review.module.css'
import styles from './bfcm-checklist.module.css'

type Errors = Partial<Record<RequestField, string>>

/**
 * "Send Me the Checklist": email (required) + store URL (optional). On success
 * the card turns into the ready state with the download and Growth Review
 * buttons — the download is offered only once the request has been confirmed
 * by the server. Nothing from the checklist ticks is sent.
 */
export function ChecklistRequestForm() {
  const [answers, setAnswers] = useState<RequestAnswers>({ email: '', website: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [turnstile, setTurnstile] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const attribution = useChecklistAttribution()
  const key = useRef<string | null>(null)
  const inFlight = useRef(false)
  const alertRef = useRef<HTMLDivElement>(null)

  const update = (field: keyof RequestAnswers, value: string) => {
    key.current = null
    setAnswers((a) => ({ ...a, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: validateRequestField(field, { ...answers, [field]: value }, turnstile) ?? undefined }))
  }
  const blur = (field: keyof RequestAnswers) => {
    if (!answers[field]) return
    setErrors((e) => ({ ...e, [field]: validateRequestField(field, answers, turnstile) ?? undefined }))
  }

  const onTurnstile = useCallback((t: string) => {
    setTurnstile(t)
    setErrors((e) => ({ ...e, turnstile: undefined }))
  }, [])
  const clearTurnstile = useCallback(() => setTurnstile(null), [])

  const fail = (message: string) => {
    inFlight.current = false
    setBusy(false)
    setSubmitError(message)
    setTurnstile(null)
    setTurnstileKey((k) => k + 1)
    window.setTimeout(() => alertRef.current?.focus(), 0)
  }

  const submit = async () => {
    if (inFlight.current) return
    const found = validateRequest(answers, turnstile)
    if (Object.keys(found).length) {
      setErrors(found)
      const first = (['email', 'website'] as const).find((f) => found[f])
      if (first) window.setTimeout(() => document.getElementById(`cl-req-${first}`)?.focus(), 0)
      return
    }
    if (!key.current) key.current = newSubmissionKey()
    const submissionKey = key.current
    inFlight.current = true
    setSubmitError(null)
    setBusy(true)
    try {
      const res = await fetch(CHECKLIST_SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildRequestPayload(answers, attribution, 'checklist_form'),
          hb_extra: '',
          turnstile_token: turnstile,
          submission_key: submissionKey,
        }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success === true) {
        trackChecklistRequested({ responseOk: res.ok, success: json.success, duplicate: json.duplicate }, submissionKey, analyticsContext(attribution, 'checklist_form'))
        inFlight.current = false
        setBusy(false)
        setReady(true)
        return
      }
      if (res.status === 429) return fail(CL_MSG.rateLimit)
      if (res.status === 400 && json && typeof json === 'object' && 'retryable' in json) return fail(CL_MSG.turnstile)
      if (res.status === 400) return fail(typeof json?.error === 'string' ? json.error : CL_MSG.rejected)
      return fail(CL_MSG.server)
    } catch {
      return fail(CL_MSG.offline)
    }
  }

  if (ready) {
    return (
      <div className={cn(growthStyles.quickCard, styles.readyCard)} role="status" data-state="ready">
        <span aria-hidden="true" className={growthStyles.cardRoute} />
        <h2 className={styles.readyTitle}>{CL_READY.title}</h2>
        <p className={styles.readyCopy}>{CL_READY.copy}</p>
        <a
          href={CHECKLIST_PDF_PATH}
          download={CHECKLIST_PDF_FILENAME}
          className={siteButtonClasses('conversion', 'lg')}
          onClick={() => trackChecklistEvent('bfcm_checklist_downloaded', analyticsContext(attribution, 'ready_state'))}
        >
          {CL_READY.download}
        </a>
        <ChecklistGrowthReviewLink location="ready_state" variant="secondary" size="lg">
          {CL_READY.growthReview}
        </ChecklistGrowthReviewLink>
      </div>
    )
  }

  const field = (name: keyof RequestAnswers, label: string, input: Record<string, unknown>) => (
    <div className={growthStyles.field}>
      <label htmlFor={`cl-req-${name}`} className={growthStyles.label}>
        {label}
      </label>
      <input
        id={`cl-req-${name}`}
        {...input}
        value={answers[name]}
        onChange={(e) => update(name, e.target.value)}
        onBlur={() => blur(name)}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `cl-req-${name}-error` : undefined}
        className={cn(growthStyles.input, errors[name] && growthStyles.inputInvalid)}
      />
      {errors[name] && (
        <p id={`cl-req-${name}-error`} className={growthStyles.error}>
          <span aria-hidden="true" className={growthStyles.errorMark}>!</span>
          {errors[name]}
        </p>
      )}
    </div>
  )

  return (
    <form
      noValidate
      id="cl-request-form"
      className={growthStyles.quickCard}
      aria-label="Send me the BFCM Readiness Checklist"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <span aria-hidden="true" className={growthStyles.cardRoute} />
      <h2 className={styles.formTitle}>{CL_FORM.title}</h2>

      {field('email', CL_FORM.emailLabel, { type: 'email', autoComplete: 'email', placeholder: CL_FORM.emailPlaceholder, spellCheck: false, autoCapitalize: 'none', 'aria-required': true })}
      {field('website', CL_FORM.urlLabel, { type: 'text', inputMode: 'url', autoComplete: 'url', placeholder: CL_FORM.urlPlaceholder, spellCheck: false, autoCapitalize: 'none' })}

      <div aria-hidden="true" className={growthStyles.honeypot}>
        <label>
          Leave this field empty
          <input type="text" name="hb_extra" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className={growthStyles.turnstile}>
        <TurnstileWidget key={turnstileKey} onVerify={onTurnstile} onExpire={clearTurnstile} onError={clearTurnstile} />
        {errors.turnstile && (
          <p className={growthStyles.error}>
            <span aria-hidden="true" className={growthStyles.errorMark}>!</span>
            {errors.turnstile}
          </p>
        )}
      </div>

      {submitError && (
        <div ref={alertRef} tabIndex={-1} className={cn(growthStyles.status, growthStyles.statusError)}>
          <p role="alert">
            <span aria-hidden="true" className={growthStyles.errorMark}>!</span>
            {submitError}
          </p>
        </div>
      )}

      <SiteButton type="submit" variant="conversion" size="lg" arrow={!busy} disabled={busy} aria-disabled={busy || undefined} className={growthStyles.quickSubmit}>
        {busy ? (
          <span className={growthStyles.busy}>
            <span aria-hidden="true" className={growthStyles.spinner} />
            {CL_FORM.busy}
          </span>
        ) : (
          CL_FORM.cta
        )}
      </SiteButton>
      <p className={growthStyles.quickNote}>
        {CL_FORM.note}{' '}
        <a href="/privacy" className={growthStyles.inlineLink}>
          Privacy Policy
        </a>
        .
      </p>
    </form>
  )
}
