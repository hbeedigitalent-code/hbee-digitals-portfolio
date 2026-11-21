'use client'

import { useEffect, useState } from 'react'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { CapabilityDiagnosticSystem } from './CapabilityDiagnosticSystem'
import { RECEIVED } from './growth-review-content'
import { GR_REQUEST_RECEIVED } from './growth-review-campaign-content'
import { RECEIPT_KEY, receiptIsValid } from './form-model'
import { QUICK_RECEIPT_KIND } from './quick-form-model'
import styles from './growth-review.module.css'

/**
 * The confirmation gate. Success is shown ONLY when this tab holds a receipt
 * marker written after the server answered { success: true } (valid for about
 * two hours, so a refresh keeps it). Anyone else — a direct visit, an old
 * bookmark, an expired marker — sees a neutral way back to the Growth Review,
 * never a fabricated "received".
 *
 * The server render is a quiet placeholder, because the marker lives in
 * sessionStorage and can only be read in the browser.
 */
export function ReceivedState() {
  const [state, setState] = useState<'checking' | 'received' | 'request' | 'neutral'>('checking')

  useEffect(() => {
    let raw: string | null = null
    try {
      raw = window.sessionStorage.getItem(RECEIPT_KEY)
    } catch {
      raw = null
    }
    const valid = receiptIsValid(raw)
    if (!valid && raw) {
      try {
        window.sessionStorage.removeItem(RECEIPT_KEY)
      } catch {
        /* ignore */
      }
    }
    // The marker's `kind` says which form was submitted: a quick Growth Review request or the full assessment.
    let kind: unknown = null
    if (valid) {
      try {
        kind = JSON.parse(raw as string)?.kind
      } catch {
        kind = null
      }
    }
    setState(!valid ? 'neutral' : kind === QUICK_RECEIPT_KIND ? 'request' : 'received')
  }, [])

  if (state === 'checking') return <div className={styles.receivedPlaceholder} aria-hidden="true" />

  if (state === 'neutral') {
    return (
      <div className={styles.neutral} data-state="neutral">
        <div className={styles.neutralText}>
          <SiteEyebrow signal>{RECEIVED.eyebrow}</SiteEyebrow>
          <h1 className={styles.neutralTitle}>{RECEIVED.neutralTitle}</h1>
          <p className={styles.neutralBody}>{RECEIVED.neutralBody}</p>
          <p className={styles.neutralExplain}>{RECEIVED.neutralExplain}</p>
          <SiteButton href="/growth-review" variant="conversion" size="lg" arrow className={styles.neutralCta}>
            Start Growth Review
          </SiteButton>
        </div>
        {/* The system at rest: no signal, no completion — this is not a confirmation. */}
        <div className={styles.neutralVisual}>
          <CapabilityDiagnosticSystem variant="idle" className="mx-auto max-w-[300px] sm:max-w-[360px] lg:mr-0 lg:max-w-[460px]" />
        </div>
      </div>
    )
  }

  if (state === 'request') {
    const R = GR_REQUEST_RECEIVED
    return (
      <div className={styles.received} data-state="request-received">
        <div className={styles.receivedText}>
          <SiteEyebrow signal>{R.eyebrow}</SiteEyebrow>
          <p className={styles.receivedStatus}>
            <span aria-hidden="true" className={styles.receivedStatusNode} />
            {R.status}
          </p>
          <SiteDisplayHeading as="h1" size="h1" className={styles.receivedTitle}>
            {R.title}
          </SiteDisplayHeading>
          <p className={styles.receivedBody}>{R.body}</p>

          <h2 className={styles.receivedH2}>{R.stepsTitle}</h2>
          <ol className={styles.receivedSteps}>
            {R.steps.map((step, i) => (
              <li key={step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <h2 className={styles.receivedH2}>{R.needTitle}</h2>
          <p className={styles.receivedBody}>{R.need}</p>

          <div className={styles.goodToKnow}>
            <h2 className={styles.goodToKnowTitle}>{R.deeperTitle}</h2>
            <p>{R.deeper}</p>
            <div className="mt-4">
              <SiteButton href="/growth-review#growth-review-assessment" variant="secondary" arrow>
                {R.deeperCta}
              </SiteButton>
            </div>
          </div>

          <div className={styles.receivedLinks}>
            <SiteLinkArrow href="/how-we-work" className="min-h-[44px]">
              How We Work
            </SiteLinkArrow>
            <SiteLinkArrow href="/" className="min-h-[44px]">
              Back to homepage
            </SiteLinkArrow>
          </div>
        </div>
        <div className={styles.receivedVisual}>
          <CapabilityDiagnosticSystem variant="received" className="mx-auto max-w-[420px]" />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.received} data-state="received">
      <div className={styles.receivedText}>
        <SiteEyebrow signal>{RECEIVED.eyebrow}</SiteEyebrow>
        <p className={styles.receivedStatus}>
          <span aria-hidden="true" className={styles.receivedStatusNode} />
          {RECEIVED.status}
        </p>
        <SiteDisplayHeading as="h1" size="h1" className={styles.receivedTitle}>
          {RECEIVED.title}
        </SiteDisplayHeading>
        <p className={styles.receivedBody}>{RECEIVED.body}</p>

        <h2 className={styles.receivedH2}>{RECEIVED.stepsTitle}</h2>
        <ol className={styles.receivedSteps}>
          {RECEIVED.steps.map((s, i) => (
            <li key={s}>
              <span aria-hidden="true" className={styles.stepNumber}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <div className={styles.goodToKnow}>
          <h2 className={styles.goodToKnowTitle}>{RECEIVED.goodToKnowTitle}</h2>
          <p>{RECEIVED.goodToKnow}</p>
        </div>

        <h2 className={styles.receivedH2}>{RECEIVED.needTitle}</h2>
        <p className={styles.receivedBody}>{RECEIVED.need}</p>

        <div className={styles.receivedLinks}>
          <SiteLinkArrow href="/how-we-work" className="min-h-[44px]">
            How We Work
          </SiteLinkArrow>
          <SiteLinkArrow href="/" className="min-h-[44px]">
            Back to homepage
          </SiteLinkArrow>
        </div>
      </div>
      <div className={styles.receivedVisual}>
        <CapabilityDiagnosticSystem variant="received" className="mx-auto max-w-[420px]" />
      </div>
    </div>
  )
}
