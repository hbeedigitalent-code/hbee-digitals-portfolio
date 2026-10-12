'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { COOKIE_CONSENT_EVENT, readCookieConsent } from '@/lib/cookie-consent'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: any[]) => void
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const SCRIPT_ID = 'hbee-ga-gtag'

/**
 * The ONE Google Analytics loader for the whole site.
 *
 * - Nothing is loaded, initialised or sent until the visitor has explicitly
 *   accepted cookies (`hbee_cookie_consent` === 'accepted'). No choice and
 *   'declined' both mean no GA.
 * - Accepting loads it immediately, without a reload (the banners fire
 *   COOKIE_CONSENT_EVENT after storing the choice).
 * - gtag's automatic page_view is switched off; one page_view is sent per
 *   App Router location, here, so a route change is counted once.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [accepted, setAccepted] = useState(false)
  const lastSent = useRef<string | null>(null)

  useEffect(() => {
    const sync = () => setAccepted(readCookieConsent() === 'accepted')
    sync()
    window.addEventListener(COOKIE_CONSENT_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (!GA_ID) return
    const flags = window as unknown as Record<string, unknown>
    if (!accepted) {
      // A visitor who withdraws consent in another tab switches measurement off at once.
      flags[`ga-disable-${GA_ID}`] = true
      return
    }
    flags[`ga-disable-${GA_ID}`] = false

    if (!document.getElementById(SCRIPT_ID)) {
      window.dataLayer = window.dataLayer || []
      window.gtag = function gtag() {
        // gtag.js expects the `arguments` object itself, not an array.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer.push(arguments)
      }
      window.gtag('js', new Date())
      window.gtag('config', GA_ID, { send_page_view: false })

      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
      document.head.appendChild(script)
    }

    const query = searchParams?.toString()
    const path = pathname + (query ? `?${query}` : '')
    if (lastSent.current === path) return
    lastSent.current = path
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
    })
  }, [accepted, pathname, searchParams])

  return null
}
