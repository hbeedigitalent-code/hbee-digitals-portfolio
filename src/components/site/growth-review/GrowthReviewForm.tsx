'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import TurnstileWidget from '@/components/ui/TurnstileWidget'
import { SiteButton } from '../primitives/SiteButton'
import { CountryPicker } from './CountryPicker'
import {
  BUSINESS_STAGES,
  CHALLENGE,
  CHANNELS,
  CONSENT_TEXT,
  DRAFT_BANNER,
  GOALS,
  GR_SECTIONS,
  IN_PLACE_CHOICES,
  IN_PLACE_ROWS,
  INDUSTRIES,
  MAX_GOALS,
  MSG,
  PUBLISHING,
  STORE_AGES,
  SUBMIT,
  SUPPORT_TYPES,
  TIMELINES,
  type Option,
} from './growth-review-content'
import {
  DRAFT_KEY,
  DRAFT_VERSION,
  EMPTY_ANSWERS,
  RECEIPT_KEY,
  SECTION_FIELDS,
  answersHash,
  buildPayload,
  draftAnswers,
  hasAnyAnswer,
  newSubmissionKey,
  readDraft,
  storeAgeApplies,
  validateField,
  validateSection,
  withBusinessStage,
  type Answers,
  type Draft,
  type FieldKey,
} from './form-model'
import styles from './growth-review.module.css'

/**
 * The Growth Review assessment (Phase 16.4). One section at a time; posts to
 * the existing hardened POST /api/growth-assessment and shows success only
 * after the server answers { success: true }.
 */

const RECEIVED_PATH = '/rebuild-growth-review/received'
const SUBMIT_URL = '/api/growth-assessment'
type Errors = Partial<Record<FieldKey, string>>
type Phase = 'idle' | 'submitting' | 'slow' | 'verySlow'

const fid = (field: FieldKey) => `gr-${field}`
const eid = (field: FieldKey) => `gr-${field}-error`

function safeStorage<T>(fn: () => T): T | null {
  try {
    return fn()
  } catch {
    return null
  }
}

/* ── Small presentational helpers ───────────────────────────── */

function FieldError({ field, message }: { field: FieldKey; message?: string }) {
  if (!message) return null
  return (
    <p id={eid(field)} className={styles.error}>
      <span aria-hidden="true" className={styles.errorMark}>!</span>
      {message}
    </p>
  )
}

function describedBy(field: FieldKey, error?: string, helper?: boolean) {
  const ids = [helper ? `${fid(field)}-help` : null, error ? eid(field) : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

function ChoiceMark() {
  return (
    <span aria-hidden="true" className={styles.choiceMark}>
      <Check strokeWidth={3} className={styles.choiceMarkIcon} />
    </span>
  )
}

interface RadioGroupProps {
  field: FieldKey
  legend: ReactNode
  options: Option[]
  value: string
  onChange: (v: string) => void
  error?: string
  variant: 'cards' | 'chips'
  helper?: string
  emphasis?: boolean
}

function RadioGroup({ field, legend, options, value, onChange, error, variant, helper, emphasis }: RadioGroupProps) {
  return (
    <fieldset className={styles.group} aria-describedby={describedBy(field, error, Boolean(helper))}>
      <legend className={cn(styles.legend, emphasis && styles.legendStrong)}>{legend}</legend>
      {helper && (
        <p id={`${fid(field)}-help`} className={styles.helper}>
          {helper}
        </p>
      )}
      <div className={variant === 'cards' ? styles.cards : styles.chips}>
        {options.map((o, i) => (
          <label key={o.value} className={cn(styles.choice, variant === 'cards' ? styles.choiceCard : styles.choiceChip)}>
            <input
              id={i === 0 ? fid(field) : undefined}
              type="radio"
              name={field}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              aria-invalid={error ? true : undefined}
              className={styles.choiceInput}
            />
            <ChoiceMark />
            <span className={styles.choiceText}>
              <span className={styles.choiceLabel}>{o.label}</span>
              {variant === 'cards' && o.description && <span className={styles.choiceDesc}>{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      <FieldError field={field} message={error} />
    </fieldset>
  )
}

/* ── Progress rail ───────────────────────────────────────────── */

function ProgressRail({
  section,
  completed,
  advanced,
  onJump,
}: {
  section: number
  completed: number
  advanced: number
  onJump: (i: number) => void
}) {
  return (
    <nav aria-label="Growth Review progress" className={styles.rail}>
      <p className={styles.railCompact} aria-hidden="true">
        <span className={styles.railCompactCount}>
          {section + 1} of {GR_SECTIONS.length}
        </span>
        <span>{GR_SECTIONS[section].name}</span>
      </p>
      <ol className={styles.railList}>
        {GR_SECTIONS.map((s, i) => {
          const state = i === section ? 'current' : i < section || i <= completed ? 'completed' : 'upcoming'
          const canJump = state === 'completed'
          // The connector after node i fills once node i + 1 has been reached.
          const filled = i + 1 <= Math.max(section, completed + 1)
          return (
            <li key={s.id} className={styles.railItem} data-state={state} data-filled={filled ? '' : undefined}>
              {i < GR_SECTIONS.length - 1 && (
                <span aria-hidden="true" className={styles.railLine}>
                  {/* The orange signal crosses only the segment just completed, once. */}
                  {advanced === i + 1 && <span key={`sig-${advanced}`} className={styles.railSignal} />}
                </span>
              )}
              {canJump ? (
                <button type="button" className={styles.railNode} onClick={() => onJump(i)}>
                  <span aria-hidden="true" className={styles.railDot}>
                    <Check strokeWidth={3} className={styles.railCheck} />
                  </span>
                  <span className={styles.railName}>
                    {s.name}
                    <span className="sr-only"> (completed — go back to this section)</span>
                  </span>
                </button>
              ) : (
                <span className={styles.railNode} aria-current={state === 'current' ? 'step' : undefined}>
                  <span aria-hidden="true" className={styles.railDot}>
                    {i + 1}
                  </span>
                  <span className={styles.railName}>
                    {s.name}
                    {state === 'upcoming' && <span className="sr-only"> (not yet available)</span>}
                  </span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* ── The form ────────────────────────────────────────────────── */

export function GrowthReviewForm() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [section, setSection] = useState(0)
  const [completed, setCompleted] = useState(-1)
  const [advanced, setAdvanced] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [summary, setSummary] = useState<FieldKey[] | null>(null)
  const [consent, setConsent] = useState(false)
  const [turnstile, setTurnstile] = useState<string | null>(null)
  // A fresh challenge = a fresh widget. The shared widget's `reset` prop only acts when it
  // flips to true, so toggling it skips every other reset; remounting by key never does.
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [draftOffer, setDraftOffer] = useState<Draft | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [retryUntil, setRetryUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [announce, setAnnounce] = useState('')

  const dirty = useRef<Set<FieldKey>>(new Set())
  const started = useRef(false)
  const submission = useRef<{ key: string; hash: string } | null>(null)
  const controller = useRef<AbortController | null>(null)
  const inFlight = useRef(false)
  const timers = useRef<number[]>([])
  const focusOnSection = useRef(false)
  const railRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const submitAlertRef = useRef<HTMLDivElement>(null)

  /* Draft offer on arrival — expired or malformed drafts are deleted silently. */
  useEffect(() => {
    const raw = safeStorage(() => window.localStorage.getItem(DRAFT_KEY))
    const draft = readDraft(raw)
    if (raw && !draft) safeStorage(() => window.localStorage.removeItem(DRAFT_KEY))
    if (draft && hasAnyAnswer(draft.answers)) setDraftOffer(draft)
    setReady(true)
  }, [])

  const writeDraft = useCallback(
    (a: Answers, s: number) => {
      if (!started.current) return
      const draft = { version: DRAFT_VERSION, savedAt: Date.now(), section: s, answers: draftAnswers(a), submission: submission.current }
      safeStorage(() => window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)))
    },
    [],
  )

  /* Debounced autosave once the visitor has started; immediate on section change. */
  useEffect(() => {
    if (!started.current || draftOffer) return
    const t = window.setTimeout(() => writeDraft(answers, section), 500)
    return () => window.clearTimeout(t)
  }, [answers, section, draftOffer, writeDraft])

  /* Move focus to the new section's heading after a section change. */
  useEffect(() => {
    if (!focusOnSection.current) return
    focusOnSection.current = false
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    railRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    headingRef.current?.focus({ preventScroll: true })
  }, [section])

  /* Rate-limit countdown tick. */
  useEffect(() => {
    if (retryUntil <= Date.now()) return
    const t = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [retryUntil])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const extra = { consent, turnstile }

  const update = <K extends keyof Answers>(field: K, value: Answers[K]) => {
    started.current = true
    dirty.current.add(field)
    const next = { ...answers, [field]: value }
    setAnswers(next)
    // An existing error re-checks as the visitor fixes it, so it clears the moment it is valid.
    if (errors[field]) {
      const msg = validateField(field, next, extra)
      setErrors((e) => {
        const copy = { ...e }
        if (msg) copy[field] = msg
        else delete copy[field]
        return copy
      })
    }
  }

  /**
   * Business stage: Planning hides store age and clears any earlier answer at
   * once (state, and so the draft and payload). Back to a selling stage, the
   * question returns blank — nothing stale is restored.
   */
  const changeStage = (stage: string) => {
    started.current = true
    dirty.current.add('business_stage')
    const next = withBusinessStage(answers, stage)
    if (next.store_age !== answers.store_age) dirty.current.delete('store_age')
    setAnswers(next)
    setErrors((e) => {
      const copy = { ...e }
      if (copy.business_stage) delete copy.business_stage
      if (!storeAgeApplies(next)) delete copy.store_age
      return copy
    })
  }

  /** Blur: only fields the visitor has actually edited are checked. */
  const blurCheck = (field: FieldKey) => {
    if (!dirty.current.has(field)) return
    const msg = validateField(field, answers, extra)
    setErrors((e) => {
      const copy = { ...e }
      if (msg) copy[field] = msg
      else delete copy[field]
      return copy
    })
  }

  const focusField = (field: FieldKey) => {
    const node = document.getElementById(fid(field))
    node?.focus()
    node?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }

  /** Validate the current section; on failure show the summary and focus the first problem. */
  const checkSection = (index: number): boolean => {
    const errs = validateSection(index, answers, extra)
    const invalid = SECTION_FIELDS[index].filter((f) => errs[f])
    setErrors((e) => {
      const copy = { ...e }
      for (const f of SECTION_FIELDS[index]) delete copy[f]
      return { ...copy, ...errs }
    })
    if (invalid.length) {
      setSummary(invalid)
      window.setTimeout(() => focusField(invalid[0]), 0)
      return false
    }
    setSummary(null)
    return true
  }

  const goTo = (index: number) => {
    focusOnSection.current = true
    setSummary(null)
    setSection(index)
    setAnnounce(`Section ${index + 1} of ${GR_SECTIONS.length}, ${GR_SECTIONS[index].name}`)
    writeDraft(answers, index)
  }

  const next = () => {
    if (!checkSection(section)) return
    setCompleted((c) => Math.max(c, section))
    setAdvanced(section + 1)
    goTo(section + 1)
  }

  const back = () => {
    if (section === 0) return
    goTo(section - 1)
  }

  const resetTurnstile = useCallback(() => {
    setTurnstile(null)
    setTurnstileKey((k) => k + 1)
  }, [])
  const onTurnstile = useCallback((token: string) => {
    setTurnstile(token)
    setErrors((e) => {
      if (!e.turnstile) return e
      const copy = { ...e }
      delete copy.turnstile
      return copy
    })
  }, [])
  const onTurnstileExpire = useCallback(() => {
    setTurnstile(null)
    setErrors((e) => ({ ...e, turnstile: MSG.turnstileExpired }))
  }, [])
  const onTurnstileError = useCallback(() => setTurnstile(null), [])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  const fail = (message: string) => {
    clearTimers()
    controller.current = null
    inFlight.current = false
    setPhase('idle')
    setSubmitError(message)
    resetTurnstile()
    window.setTimeout(() => submitAlertRef.current?.focus(), 0)
  }

  const submit = async () => {
    // A ref, not `phase`: several clicks in one tick all see the same stale state.
    if (inFlight.current) return
    if (retryUntil > Date.now()) return
    // Every earlier section was validated on Next, but answers can be edited after.
    for (let i = 0; i < GR_SECTIONS.length; i++) {
      if (Object.keys(validateSection(i, answers, extra)).length) {
        if (i !== section) goTo(i)
        window.setTimeout(() => checkSection(i), 0)
        return
      }
    }

    // ONE submission reference per set of answers: unchanged answers reuse it
    // (the endpoint's idempotency then prevents duplicates); changed answers get
    // a new one before sending.
    const hash = answersHash(answers)
    if (!submission.current || submission.current.hash !== hash) submission.current = { key: newSubmissionKey(), hash }
    started.current = true
    writeDraft(answers, section)

    inFlight.current = true
    setSubmitError(null)
    setPhase('submitting')
    timers.current.push(window.setTimeout(() => setPhase((p) => (p === 'submitting' ? 'slow' : p)), 8_000))
    timers.current.push(window.setTimeout(() => setPhase((p) => (p === 'slow' || p === 'submitting' ? 'verySlow' : p)), 45_000))

    const ac = new AbortController()
    controller.current = ac
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(answers), turnstile_token: turnstile, submission_key: submission.current.key }),
        signal: ac.signal,
      })
      const json = await res.json().catch(() => null)

      if (res.ok && json?.success === true) {
        clearTimers()
        submission.current = null
        safeStorage(() => window.localStorage.removeItem(DRAFT_KEY))
        safeStorage(() => window.sessionStorage.setItem(RECEIPT_KEY, JSON.stringify({ at: Date.now() })))
        router.push(RECEIVED_PATH)
        return
      }
      if (res.status === 429) {
        const after = Number(res.headers.get('Retry-After'))
        setRetryUntil(Date.now() + (Number.isFinite(after) && after > 0 ? after * 1000 : 5 * 60_000))
        setNow(Date.now())
        return fail(MSG.rateLimit)
      }
      if (res.status === 409) {
        submission.current = null // a fresh reference is created on the next attempt
        return fail(MSG.conflict)
      }
      if (res.status === 400 && json && typeof json === 'object' && 'retryable' in json) return fail(MSG.turnstile)
      if (res.status === 400) return fail(MSG.rejected)
      return fail(MSG.server)
    } catch (error) {
      if (ac.signal.aborted) return
      return fail(MSG.offline)
    }
  }

  /** "Try again" on a very slow request: same answers keep the same reference, so no duplicate. */
  const retrySlow = () => {
    controller.current?.abort()
    controller.current = null
    fail(MSG.turnstileMissing + " Then submit again — your answers are kept, so this won't create a duplicate.")
  }

  const startOver = () => {
    safeStorage(() => window.localStorage.removeItem(DRAFT_KEY))
    submission.current = null
    setDraftOffer(null)
  }

  const continueDraft = () => {
    if (!draftOffer) return
    started.current = true
    submission.current = draftOffer.submission
    setAnswers(draftOffer.answers)
    setCompleted(draftOffer.section - 1)
    setSection(draftOffer.section)
    setDraftOffer(null)
    focusOnSection.current = true
    setAnnounce(`Section ${draftOffer.section + 1} of ${GR_SECTIONS.length}, ${GR_SECTIONS[draftOffer.section].name}`)
  }

  const busy = phase !== 'idle'
  const limited = retryUntil > now
  const minutesLeft = Math.max(1, Math.ceil((retryUntil - now) / 60_000))
  const s = GR_SECTIONS[section]

  const text = (field: keyof Answers & FieldKey, label: string, opts: { type?: string; auto?: string; mode?: 'url' | 'email' | 'text'; helper?: string; placeholder?: string }) => (
    <div className={styles.field}>
      <label htmlFor={fid(field)} className={styles.label}>
        {label}
        <span aria-hidden="true" className={styles.req}> *</span>
      </label>
      <input
        id={fid(field)}
        type={opts.type ?? 'text'}
        inputMode={opts.mode}
        autoComplete={opts.auto}
        placeholder={opts.placeholder}
        value={answers[field] as string}
        onChange={(e) => update(field, e.target.value as never)}
        onBlur={() => blurCheck(field)}
        aria-required="true"
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={describedBy(field, errors[field], Boolean(opts.helper))}
        className={cn(styles.input, errors[field] && styles.inputInvalid)}
        spellCheck={opts.type === 'email' || opts.mode === 'url' ? false : undefined}
        autoCapitalize={opts.type === 'email' || opts.mode === 'url' ? 'none' : undefined}
      />
      {opts.helper && (
        <p id={`${fid(field)}-help`} className={styles.helper}>
          {opts.helper}
        </p>
      )}
      <FieldError field={field} message={errors[field]} />
    </div>
  )

  if (!ready) return <div className={styles.formSkeleton} aria-hidden="true" />

  if (draftOffer) {
    return (
      <div className={styles.draft} role="region" aria-labelledby="gr-draft-title">
        <p id="gr-draft-title" className={styles.draftTitle}>
          {DRAFT_BANNER.title}
        </p>
        <p className={styles.helper}>{DRAFT_BANNER.note}</p>
        <div className={styles.actions}>
          <SiteButton variant="conversion" onClick={continueDraft} arrow>
            {DRAFT_BANNER.continue}
          </SiteButton>
          <SiteButton variant="secondary" onClick={startOver}>
            {DRAFT_BANNER.startOver}
          </SiteButton>
        </div>
      </div>
    )
  }

  const goalsFull = answers.primary_goals.length >= MAX_GOALS
  // The summary shrinks as answers are fixed, and disappears when none remain.
  const openSummary = (summary ?? []).filter((f) => errors[f])

  return (
    <div>
      <div ref={railRef} className={styles.railWrap}>
        <ProgressRail section={section} completed={completed} advanced={advanced} onJump={(i) => goTo(i)} />
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <form
        noValidate
        className={styles.card}
        style={{ '--gr-progress': (section + 1) / GR_SECTIONS.length } as CSSProperties}
        aria-labelledby="gr-section-title"
        onSubmit={(e) => {
          e.preventDefault()
          if (section < GR_SECTIONS.length - 1) next()
          else void submit()
        }}
      >
        <span aria-hidden="true" className={styles.cardRoute} />
        <div key={section} className={styles.sectionBody}>
          <div className={styles.sectionHead}>
            <span aria-hidden="true" className={styles.sectionNumber}>
              {String(section + 1).padStart(2, '0')}
            </span>
            <div>
              <p className={styles.sectionCount}>
                Section {section + 1} of {GR_SECTIONS.length}
              </p>
              <h2 id="gr-section-title" ref={headingRef} tabIndex={-1} className={styles.sectionTitle}>
                {s.name}
              </h2>
            </div>
          </div>
          <p className={styles.sectionIntro}>{s.intro}</p>

          {openSummary.length > 0 && (
            <div className={styles.summary} role="group" aria-labelledby="gr-summary-title">
              <p id="gr-summary-title" className={styles.summaryTitle}>
                <span aria-hidden="true" className={styles.errorMark}>!</span>
                {openSummary.length === 1 ? '1 answer needs attention' : `${openSummary.length} answers need attention`}
              </p>
              <ul className={styles.summaryList}>
                {openSummary.map((f) => (
                  <li key={f}>
                    <a
                      href={`#${fid(f)}`}
                      onClick={(e) => {
                        e.preventDefault()
                        focusField(f)
                      }}
                    >
                      {errors[f]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === 0 && (
            <div className={styles.grid2}>
              {text('business_name', 'Business name', { auto: 'organization', placeholder: 'e.g. Your Business Ltd' })}
              {text('website', 'Website or store URL', {
                mode: 'url',
                auto: 'url',
                placeholder: 'e.g. yourstore.com',
                helper: 'Enter your website, online store or main selling page.',
              })}
              {text('contact_name', 'Your name', { auto: 'name' })}
              {text('email', 'Email address', {
                type: 'email',
                mode: 'email',
                auto: 'email',
                placeholder: 'you@yourbusiness.com',
                helper: "We'll send your confirmation here.",
              })}
              <div className={styles.field}>
                <label htmlFor={fid('country')} className={styles.label}>
                  Country<span aria-hidden="true" className={styles.req}> *</span>
                </label>
                <CountryPicker
                  id={fid('country')}
                  value={answers.country}
                  onChange={(c) => update('country', c)}
                  onBlurValidate={() => {
                    dirty.current.add('country')
                    window.setTimeout(() => blurCheck('country'), 0)
                  }}
                  invalid={Boolean(errors.country)}
                  describedBy={describedBy('country', errors.country)}
                />
                <FieldError field="country" message={errors.country} />
              </div>
              <div className={styles.field}>
                <label htmlFor={fid('industry')} className={styles.label}>
                  Industry<span aria-hidden="true" className={styles.req}> *</span>
                </label>
                <select
                  id={fid('industry')}
                  value={answers.industry}
                  onChange={(e) => update('industry', e.target.value)}
                  onBlur={() => blurCheck('industry')}
                  aria-required="true"
                  aria-invalid={errors.industry ? true : undefined}
                  aria-describedby={describedBy('industry', errors.industry)}
                  className={cn(styles.input, styles.select, errors.industry && styles.inputInvalid)}
                >
                  <option value="">Choose the closest industry</option>
                  {INDUSTRIES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <FieldError field="industry" message={errors.industry} />
              </div>
            </div>
          )}

          {section === 1 && (
            <div className={styles.stack}>
              <RadioGroup
                field="business_stage"
                legend="Where is the business today?"
                options={BUSINESS_STAGES}
                value={answers.business_stage}
                onChange={changeStage}
                error={errors.business_stage}
                variant="cards"
                emphasis
              />
              {storeAgeApplies(answers) && (
                <RadioGroup
                  field="store_age"
                  legend="How long have you been selling?"
                  options={STORE_AGES}
                  value={answers.store_age}
                  onChange={(v) => update('store_age', v)}
                  error={errors.store_age}
                  variant="chips"
                />
              )}

              <fieldset className={styles.group} aria-describedby={describedBy('marketing_channels', errors.marketing_channels, true)}>
                <legend className={cn(styles.legend, styles.legendStrong)}>How do customers find you today?</legend>
                <p id={`${fid('marketing_channels')}-help`} className={styles.helper}>
                  Choose all that apply.
                </p>
                <div className={styles.chips}>
                  {CHANNELS.map((o, i) => {
                    const on = answers.marketing_channels.includes(o.value)
                    return (
                      <label key={o.value} className={cn(styles.choice, styles.choiceChip)}>
                        <input
                          id={i === 0 ? fid('marketing_channels') : undefined}
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            update(
                              'marketing_channels',
                              on ? answers.marketing_channels.filter((c) => c !== o.value) : [...answers.marketing_channels, o.value],
                            )
                          }
                          aria-invalid={errors.marketing_channels ? true : undefined}
                          className={styles.choiceInput}
                        />
                        <ChoiceMark />
                        <span className={styles.choiceLabel}>{o.label}</span>
                      </label>
                    )
                  })}
                </div>
                <FieldError field="marketing_channels" message={errors.marketing_channels} />
              </fieldset>

              <div className={styles.matrix}>
                <p className={styles.matrixTitle}>What&rsquo;s already in place?</p>
                <p className={styles.helper}>Choose one answer for each.</p>
                {IN_PLACE_ROWS.map((row) => (
                  <fieldset key={row.field} className={styles.matrixRow} aria-describedby={errors[row.field] ? eid(row.field) : undefined}>
                    <legend className={styles.matrixLegend}>{row.label}</legend>
                    <div className={styles.segments}>
                      {IN_PLACE_CHOICES.map((c, i) => (
                        <label key={c.value} className={cn(styles.choice, styles.segment)}>
                          <input
                            id={i === 0 ? fid(row.field) : undefined}
                            type="radio"
                            name={row.field}
                            value={c.value}
                            checked={answers[row.field] === c.value}
                            onChange={() => update(row.field, c.value)}
                            aria-invalid={errors[row.field] ? true : undefined}
                            className={styles.choiceInput}
                          />
                          <ChoiceMark />
                          <span className={styles.choiceLabel}>{c.label}</span>
                        </label>
                      ))}
                    </div>
                    <FieldError field={row.field} message={errors[row.field]} />
                  </fieldset>
                ))}
              </div>

              <RadioGroup
                field="content_publishing"
                legend="How often do you publish content?"
                options={PUBLISHING}
                value={answers.content_publishing}
                onChange={(v) => update('content_publishing', v)}
                error={errors.content_publishing}
                variant="chips"
              />

              <fieldset className={styles.group} aria-describedby={describedBy('visibility_confidence', errors.visibility_confidence, true)}>
                <legend className={styles.legend}>How confident are you that the right customers can find you today?</legend>
                <p id={`${fid('visibility_confidence')}-help`} className={styles.helper}>
                  1 means not at all confident, 10 means very confident.
                </p>
                <div className={styles.scale}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <label key={n} className={cn(styles.choice, styles.scaleItem)}>
                      <input
                        id={n === 1 ? fid('visibility_confidence') : undefined}
                        type="radio"
                        name="visibility_confidence"
                        value={n}
                        checked={answers.visibility_confidence === n}
                        onChange={() => update('visibility_confidence', n)}
                        aria-invalid={errors.visibility_confidence ? true : undefined}
                        className={styles.choiceInput}
                      />
                      <span className={styles.choiceLabel}>{n}</span>
                    </label>
                  ))}
                </div>
                <div aria-hidden="true" className={styles.scaleAnchors}>
                  <span>Not at all confident</span>
                  <span>Very confident</span>
                </div>
                <FieldError field="visibility_confidence" message={errors.visibility_confidence} />
              </fieldset>
            </div>
          )}

          {section === 2 && (
            <fieldset className={styles.group} aria-describedby={describedBy('primary_goals', errors.primary_goals, true)}>
              <legend className={cn(styles.legend, styles.legendStrong)}>What would you most like to improve over the next 90 days?</legend>
              <p id={`${fid('primary_goals')}-help`} className={styles.helper}>
                Choose up to {MAX_GOALS}.{' '}
                <span className={styles.counter} aria-live="polite">
                  {answers.primary_goals.length} of {MAX_GOALS} chosen
                </span>
                {goalsFull && <span className={styles.limitNote}> Remove one to choose another.</span>}
              </p>
              <div className={styles.chips}>
                {GOALS.map((o, i) => {
                  const on = answers.primary_goals.includes(o.value)
                  const unavailable = goalsFull && !on
                  return (
                    <label key={o.value} className={cn(styles.choice, styles.choiceChip, unavailable && styles.choiceUnavailable)}>
                      <input
                        id={i === 0 ? fid('primary_goals') : undefined}
                        type="checkbox"
                        checked={on}
                        aria-disabled={unavailable || undefined}
                        onChange={(e) => {
                          if (unavailable) {
                            e.preventDefault()
                            return
                          }
                          update('primary_goals', on ? answers.primary_goals.filter((g) => g !== o.value) : [...answers.primary_goals, o.value])
                        }}
                        aria-invalid={errors.primary_goals ? true : undefined}
                        className={styles.choiceInput}
                      />
                      <ChoiceMark />
                      <span className={styles.choiceLabel}>
                        {o.label}
                        {unavailable && <span className="sr-only"> (unavailable — 3 goals already chosen)</span>}
                      </span>
                    </label>
                  )
                })}
              </div>
              <FieldError field="primary_goals" message={errors.primary_goals} />
            </fieldset>
          )}

          {section === 3 && (
            <div className={styles.field}>
              <label htmlFor={fid('biggest_challenge')} className={cn(styles.label, styles.legendStrong)}>
                {CHALLENGE.label}
                <span aria-hidden="true" className={styles.req}> *</span>
              </label>
              <p id={`${fid('biggest_challenge')}-help`} className={styles.helper}>
                {CHALLENGE.helper} <span className={styles.example}>{CHALLENGE.example}</span>
              </p>
              <textarea
                id={fid('biggest_challenge')}
                rows={5}
                maxLength={CHALLENGE.max}
                value={answers.biggest_challenge}
                onChange={(e) => {
                  update('biggest_challenge', e.target.value)
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 360)}px`
                }}
                onBlur={() => blurCheck('biggest_challenge')}
                aria-required="true"
                aria-invalid={errors.biggest_challenge ? true : undefined}
                aria-describedby={describedBy('biggest_challenge', errors.biggest_challenge, true)}
                className={cn(styles.input, styles.textarea, errors.biggest_challenge && styles.inputInvalid)}
              />
              {answers.biggest_challenge.length >= CHALLENGE.counterFrom && (
                <p className={styles.helper} aria-live="polite">
                  {CHALLENGE.max - answers.biggest_challenge.length} characters left
                </p>
              )}
              <FieldError field="biggest_challenge" message={errors.biggest_challenge} />
            </div>
          )}

          {section === 4 && (
            <div className={styles.stack}>
              <RadioGroup
                field="support_type"
                legend="What kind of support would be most useful?"
                helper="This helps us suggest the right next step. It doesn't commit you to anything."
                options={SUPPORT_TYPES}
                value={answers.support_type}
                onChange={(v) => update('support_type', v)}
                error={errors.support_type}
                variant="cards"
                emphasis
              />
              <RadioGroup
                field="improvement_timeline"
                legend="When are you hoping to make improvements?"
                options={TIMELINES}
                value={answers.improvement_timeline}
                onChange={(v) => update('improvement_timeline', v)}
                error={errors.improvement_timeline}
                variant="chips"
                emphasis
              />

              <div className={styles.consent}>
                <label className={styles.consentLabel}>
                  <input
                    id={fid('consent')}
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked)
                      if (e.target.checked)
                        setErrors((er) => {
                          const copy = { ...er }
                          delete copy.consent
                          return copy
                        })
                    }}
                    aria-invalid={errors.consent ? true : undefined}
                    aria-describedby={errors.consent ? eid('consent') : undefined}
                    className={styles.consentBox}
                  />
                  <span>
                    {CONSENT_TEXT}{' '}
                    <Link href="/privacy" className={styles.inlineLink}>
                      Read our Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <FieldError field="consent" message={errors.consent} />
              </div>

              <div id={fid('turnstile')} tabIndex={-1} className={styles.turnstile} aria-describedby={errors.turnstile ? eid('turnstile') : undefined}>
                <TurnstileWidget key={turnstileKey} onVerify={onTurnstile} onExpire={onTurnstileExpire} onError={onTurnstileError} />
                <FieldError field="turnstile" message={errors.turnstile} />
              </div>
            </div>
          )}
        </div>

        {(submitError || busy) && section === 4 && (
          <div ref={submitAlertRef} tabIndex={-1} className={cn(styles.status, submitError && styles.statusError)}>
            {submitError ? (
              <p role="alert">
                <span aria-hidden="true" className={styles.errorMark}>!</span>
                {submitError}
                {limited && <span className={styles.statusMeta}> Try again in about {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}.</span>}
              </p>
            ) : (
              <p aria-live="polite">
                {phase === 'slow' && SUBMIT.slow}
                {phase === 'verySlow' && SUBMIT.verySlow}
              </p>
            )}
            {phase === 'verySlow' && (
              <button type="button" className={styles.inlineButton} onClick={retrySlow}>
                {SUBMIT.retry}
              </button>
            )}
          </div>
        )}

        <div className={styles.actions}>
          {section > 0 && (
            <SiteButton type="button" variant="secondary" onClick={back} disabled={busy}>
              Back
            </SiteButton>
          )}
          {section < GR_SECTIONS.length - 1 ? (
            <SiteButton type="submit" variant="conversion" arrow className={styles.primaryAction}>
              Next
            </SiteButton>
          ) : (
            <SiteButton
              type="submit"
              variant="conversion"
              arrow={!busy}
              disabled={busy || limited}
              aria-disabled={busy || limited || undefined}
              className={styles.primaryAction}
            >
              {busy ? (
                <span className={styles.busy}>
                  <span aria-hidden="true" className={styles.spinner} />
                  {SUBMIT.busy}
                </span>
              ) : (
                SUBMIT.idle
              )}
            </SiteButton>
          )}
        </div>
      </form>
    </div>
  )
}
