import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'

import GoogleAnalytics from '@/components/GoogleAnalytics'
import CookieConsent from '@/components/CookieBanner'
import StructuredData from '@/components/StructuredData'
import CursorGlow from '@/components/ui/CursorGlow'
import PageUtilities from '@/components/ui/PageUtilities'
import FocusedHeader from '@/components/focused/FocusedHeader'
import FocusedFooter from '@/components/focused/FocusedFooter'

/**
 * Compact chrome for the three focused conversion routes:
 *
 *   /growth-readiness
 *   /assessment
 *   /assessment/thank-you
 *
 * WHY A ROUTE GROUP. `(focused)` and `(marketing)` are both route groups, so
 * neither appears in a URL — every path above is byte-for-byte unchanged, and
 * so is each page's exported `metadata`. Moving these three directories out of
 * `(marketing)` is what stops the site Navbar and the full marketing Footer
 * from rendering here at all. Nothing is rendered and then hidden with CSS:
 * the Navbar's menu markup, dropdown state, mobile drawer and hide-on-scroll
 * listener simply do not exist on these pages, so there is nothing to flash.
 *
 * WHAT IS DELIBERATELY KEPT, matching (marketing)/layout.tsx:
 *   - GoogleAnalytics + the deferred GA script      (analytics)
 *   - CookieConsent                                 (consent controls)
 *   - StructuredData                                (organization JSON-LD)
 *   - CursorGlow                                    (the existing site visual)
 *   - PageUtilities                                 (scroll progress + back-to-top)
 * Theme handling and the web-vitals Providers come from the root layout, which
 * is shared, so both are unchanged. Turnstile lives inside AssessmentForm and
 * is unaffected by where the route file sits.
 *
 * WHAT IS DELIBERATELY DROPPED:
 *   - Navbar and the marketing Footer               (replaced by the compact pair)
 *   - SubscribePopup                                (promotional popup)
 *   - FloatingWhatsApp                              (promotional floating tab)
 * The service-worker registration also stays in (marketing): it is a caching
 * concern for the browsable site, and re-registering it from a second layout
 * would run the same script twice for a visitor who crosses between groups.
 */
export default function FocusedLayout({ children }: { children: ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <>
      <Suspense fallback={null}>
        <CursorGlow />
      </Suspense>

      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>

      <StructuredData />

      <FocusedHeader />
      {children}
      <FocusedFooter />

      <CookieConsent />
      <PageUtilities />

      {gaId && <NextGoogleAnalytics gaId={gaId} />}
    </>
  )
}
