'use client'

import { useEffect, useState } from 'react'

import {
  ATTRIBUTION_STORAGE_KEY,
  resolveAttribution,
  type QuickAttribution,
} from '../growth-review/quick-form-model'
import type { RequestAnalyticsContext } from '@/lib/analytics'

/**
 * The visit's campaign attribution (utm_* from the landing URL, remembered for
 * the tab session, plus an external referrer host). Empty on the server and
 * until the first effect, so the static page never depends on it.
 */
export function useChecklistAttribution(): QuickAttribution {
  const [attribution, setAttribution] = useState<QuickAttribution>({})
  useEffect(() => {
    try {
      setAttribution(
        resolveAttribution(window.location.search, document.referrer, window.location.hostname, {
          get: () => window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY),
          set: (v) => window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, v),
        }),
      )
    } catch {
      /* attribution is optional */
    }
  }, [])
  return attribution
}

/** Analytics context: campaign labels and a CTA location only. */
export function analyticsContext(attribution: QuickAttribution, cta_location: string): RequestAnalyticsContext {
  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    cta_location,
  }
}
