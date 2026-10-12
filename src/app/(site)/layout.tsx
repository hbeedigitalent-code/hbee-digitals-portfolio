import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'

import '@/styles/site-tokens.css'
import { manrope } from '@/components/site/fonts'
import { SiteHeader } from '@/components/site/layout/SiteHeader'
import { SiteFooter } from '@/components/site/layout/SiteFooter'
import { SiteMotionGate, SiteMotionLive } from '@/components/site/motion/SiteMotionScript'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import { SiteCookieConsent } from '@/components/site/layout/SiteCookieConsent'
import StructuredData from '@/components/StructuredData'

/**
 * Layout for the public site: /, /services, /work, /how-we-work, /insights,
 * /about, /growth-review, /contact and their detail pages.
 *
 * Route groups do not affect URLs. Everything inside renders under
 * [data-surface="site"], which is where the --hb-* tokens, Manrope and the
 * scoped base styles apply. The root layout's global theme script and tokens
 * are untouched; this surface simply does not read them.
 *
 * Site-wide integrations kept from the previous public layout, rendered
 * outside the surface exactly as before: Google Analytics (page views follow
 * the route), cookie consent (site-styled, same storage key), Organization JSON-LD and service-worker
 * registration. The legacy promotional widgets (subscribe popup, floating
 * WhatsApp tab, cursor glow, scroll utilities) are not part of the approved
 * public design and are not rendered here.
 *
 * suppressHydrationWarning: the pre-paint motion gate adds data-motion-ready
 * to this element before React hydrates.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <>
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>

      <StructuredData />

      <div
        data-surface="site"
        data-surface-root=""
        // overflow-x: clip — reveal start states (e.g. SHIFT's 32px offset) must
        // never create sideways page scroll on phones. `clip` (not `hidden`) does
        // not create a scroll container, so the sticky header keeps working.
        className={`${manrope.variable} flex min-h-screen flex-col overflow-x-clip`}
        suppressHydrationWarning
      >
        <SiteMotionGate />
        <SiteMotionLive />
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <SiteCookieConsent />
      </div>

      {/* Load analytics after page load */}
      {gaId && <NextGoogleAnalytics gaId={gaId} />}

      {/* Service Worker for caching */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(console.error);
              });
            }
          `,
        }}
      />
    </>
  )
}
