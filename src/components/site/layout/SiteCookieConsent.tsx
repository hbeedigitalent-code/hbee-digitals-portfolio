'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import { readCookieConsent, storeCookieConsent } from '@/lib/cookie-consent'

/**
 * Cookie consent for the public site surface.
 *
 * Same behaviour, copy and storage key ('hbee_cookie_consent') as the legacy
 * banner in src/components/CookieBanner.tsx, so an existing visitor's choice
 * carries over. It exists because the legacy banner is styled with the dark
 * global theme tokens and is unreadable on this light surface; this one uses the
 * site's --hb-* tokens and must be rendered inside [data-surface="site"].
 */
export function SiteCookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!readCookieConsent()) {
      const timer = window.setTimeout(() => setVisible(true), 900)
      return () => window.clearTimeout(timer)
    }
  }, [])

  const save = (value: 'accepted' | 'declined') => {
    storeCookieConsent(value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-3 sm:px-5 sm:pb-5">
      <div
        role="region"
        aria-label="Cookie consent"
        className="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-[var(--hb-radius-md)] border border-hb-border bg-hb-white p-4 text-hb-fg shadow-[var(--hb-shadow-2,0_12px_40px_rgba(7,26,50,0.18))] sm:p-5 lg:flex-row lg:items-center"
      >
        <div className="flex-1">
          <p className="font-hb-body text-sm font-semibold text-hb-fg sm:text-base">We use cookies to improve your experience</p>
          <p className="mt-1 max-w-3xl font-hb-body text-xs leading-5 text-hb-fg-body sm:text-sm sm:leading-6">
            We use cookies to understand site performance, improve browsing, and personalize your experience. Read our{' '}
            <Link href="/privacy" className="font-semibold text-hb-link underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-3 sm:flex-shrink-0">
          <button
            type="button"
            onClick={() => save('declined')}
            className="min-h-[44px] rounded-[var(--hb-radius-md)] border-[1.5px] border-hb-link px-5 text-sm font-semibold text-hb-link transition-colors hover:bg-hb-plane"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => save('accepted')}
            className="min-h-[44px] rounded-l-[var(--hb-radius-xs)] rounded-r-[var(--hb-radius-pill)] bg-hb-orange px-5 text-sm font-semibold text-hb-night transition-colors hover:bg-[#ff7440]"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
