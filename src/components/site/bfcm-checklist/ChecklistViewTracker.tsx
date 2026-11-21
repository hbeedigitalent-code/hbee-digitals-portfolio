'use client'

import { useEffect } from 'react'
import { trackChecklistEvent } from '@/lib/analytics'
import { analyticsContext, useChecklistAttribution } from './useChecklistAttribution'

/** Fires bfcm_checklist_viewed once per page view (consent-gated, no PII). Renders nothing. */
export function ChecklistViewTracker() {
  const attribution = useChecklistAttribution()
  const ready = Object.keys(attribution).length > 0
  useEffect(() => {
    // Wait one tick for attribution to resolve; fire immediately when there is none to wait for.
    const t = window.setTimeout(() => trackChecklistEvent('bfcm_checklist_viewed', analyticsContext(attribution, 'page')), ready ? 0 : 400)
    return () => window.clearTimeout(t)
  }, [attribution, ready])
  return null
}
