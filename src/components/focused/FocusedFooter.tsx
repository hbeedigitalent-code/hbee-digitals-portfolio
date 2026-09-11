// src/components/focused/FocusedFooter.tsx
//
// The compact footer for the three focused routes.
//
// Name and copyright, one support address, the two existing legal routes, and
// at most one discreet website link. No newsletter form, no service directory,
// no social feed and no promotional block — the full marketing Footer is not
// rendered on these routes at all.
//
// The legal hrefs are the routes that already exist in this application
// (src/app/(marketing)/privacy and .../terms). No URL is invented here.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SUPPORT_EMAIL } from '@/components/focused/FocusedHeader'

const SITE_NAME = 'Hbee Digitals'
const WEBSITE_URL = 'https://www.hbeedigitals.com'

const LINK_CLASS =
  'rounded text-[var(--text-muted)] transition hover:text-[var(--text-primary)] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

export default function FocusedFooter() {
  const pathname = usePathname()

  // Exactly one website link per page. /growth-readiness already carries it in
  // the header, so the footer omits it there rather than repeating it.
  const showWebsiteLink = pathname !== '/growth-readiness'

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-page)]">
      <div className="container-custom flex flex-col items-center gap-4 py-8 text-sm sm:flex-row sm:justify-between">
        <p className="text-[var(--text-muted)]">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>
            {SUPPORT_EMAIL}
          </a>
          <Link href="/privacy" className={LINK_CLASS}>
            Privacy
          </Link>
          <Link href="/terms" className={LINK_CLASS}>
            Terms
          </Link>
          {showWebsiteLink && (
            <a href={WEBSITE_URL} className={LINK_CLASS} rel="noopener noreferrer">
              hbeedigitals.com
            </a>
          )}
        </nav>
      </div>
    </footer>
  )
}
