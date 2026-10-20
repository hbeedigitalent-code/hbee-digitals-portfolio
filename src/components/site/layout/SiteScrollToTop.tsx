'use client'

import { useEffect, useState } from 'react'
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY, readCookieConsent } from '@/lib/cookie-consent'
import { siteButtonClasses } from '../primitives/SiteButton'
import { SiteChevron } from '../primitives/SiteIcons'

/** Standalone public utility. Wait for cookie choice so the controls cannot collide. */
export function SiteScrollToTop() {
  const [scrolled, setScrolled] = useState(false)
  const [consentResolved, setConsentResolved] = useState(false)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(window.scrollY > Math.max(600, window.innerHeight * 0.75))
      setProgress(distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0)
    }
    const onConsent = () => setConsentResolved(true)
    const onStorage = (event: StorageEvent) => { if (event.key === COOKIE_CONSENT_KEY || event.key === null) setConsentResolved(Boolean(readCookieConsent())) }
    setConsentResolved(Boolean(readCookieConsent())); onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent)
    window.addEventListener('storage', onStorage)
    // Keep progress accurate when async content changes the document height.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll)
    resize?.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll)
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent); window.removeEventListener('storage', onStorage)
      resize?.disconnect()
    }
  }, [])
  function returnToTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }
  if (!scrolled || !consentResolved) return null
  return <button type="button" aria-label="Scroll to top" onClick={returnToTop}
    className={siteButtonClasses('brand', 'md', 'fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 !h-11 !w-11 !min-h-0 !rounded-full !p-0 md:right-6')}>
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90 overflow-visible">
      <circle cx="24" cy="24" r="23" fill="none" stroke="var(--hb-orange)" strokeWidth="2" pathLength="100" strokeDasharray="100" strokeDashoffset={100 * (1 - progress)} />
    </svg>
    <SiteChevron size={20} className="rotate-180" />
  </button>
}
