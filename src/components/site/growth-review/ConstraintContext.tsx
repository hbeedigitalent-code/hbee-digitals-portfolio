'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { GR_CONSTRAINT_CONTEXT } from './growth-review-content'
import { constraintSymptom } from './constraint-context'
import styles from './growth-review.module.css'

/**
 * A small contextual line for visitors who arrive from the homepage self-check
 * (/growth-review?constraint=<key>). Read in the browser with useSearchParams
 * inside Suspense so /growth-review stays statically rendered. Renders nothing
 * for a missing or unrecognized value. Display only: no hidden field, no
 * pre-filled answer, no effect on scoring.
 */
function Line({ variant }: { variant: 'hero' | 'form' }) {
  const symptom = constraintSymptom(useSearchParams().get('constraint'))
  if (!symptom) return null
  return (
    <p className={styles.constraintNote} data-variant={variant} data-constraint-note="">
      <span className={styles.constraintLead}>{GR_CONSTRAINT_CONTEXT.lead}</span> “{symptom}” {GR_CONSTRAINT_CONTEXT.tail}
    </p>
  )
}

export function ConstraintContext({ variant }: { variant: 'hero' | 'form' }) {
  return (
    <Suspense fallback={null}>
      <Line variant={variant} />
    </Suspense>
  )
}
