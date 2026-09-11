// src/components/focused/FocusedHeader.tsx
//
// The compact header for the three focused routes (/growth-readiness,
// /assessment, /assessment/thank-you).
//
// It is NOT the site Navbar with things hidden. The Navbar is not rendered on
// these routes at all — they live in the (focused) route group, which has its
// own layout — so there is no menu markup, no dropdown state, no mobile drawer
// and no hide-on-scroll listener to suppress. Nothing here can flash open.
//
// One logo, one discreet contextual link, and nothing that competes with the
// assessment itself. The logo is the approved blue/orange mark and carries the
// same `brand-logo` class the Navbar uses, which is what adds the light plate
// in dark mode; it is not restyled here.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LOGO_SRC = '/svgs/logo.svg'
const SITE_NAME = 'Hbee Digitals'
export const SUPPORT_EMAIL = 'hello@hbeedigitals.com'

const LINK_CLASS =
  'rounded-full px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition ' +
  'hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

/**
 * Which discreet link the header shows, by route:
 *
 *   /growth-readiness        "Visit our website"  (the marketing entry point)
 *   /assessment              "Need help?"          (support, mid-form)
 *   /assessment/thank-you    none — minimal header; the website link is in the
 *                            footer instead, so the confirmation page carries
 *                            exactly one outbound link.
 */
function linkFor(pathname: string | null) {
  if (pathname === '/growth-readiness') {
    return { href: 'https://www.hbeedigitals.com', label: 'Visit our website', external: true }
  }
  if (pathname === '/assessment') {
    return {
      href: `mailto:${SUPPORT_EMAIL}?subject=Help%20with%20the%20Growth%20Readiness%20Assessment`,
      label: 'Need help?',
      external: false,
    }
  }
  return null
}

export default function FocusedHeader() {
  const pathname = usePathname()
  const link = linkFor(pathname)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg-page)]/95 backdrop-blur-sm">
      <div className="container-custom flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
          aria-label={`${SITE_NAME} home`}
        >
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center">
            <img
              src={LOGO_SRC}
              alt={`${SITE_NAME} logo`}
              className="brand-logo h-7 w-7 object-contain"
            />
          </span>
          <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">
            {SITE_NAME}
          </span>
        </Link>

        {link && (
          link.external ? (
            <a href={link.href} className={LINK_CLASS} rel="noopener noreferrer">
              {link.label}
            </a>
          ) : (
            <a href={link.href} className={LINK_CLASS}>
              {link.label}
            </a>
          )
        )}
      </div>
    </header>
  )
}
