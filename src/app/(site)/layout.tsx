import type { ReactNode } from 'react'

import '@/styles/site-tokens.css'
import { manrope } from '@/components/site/fonts'
import { SiteHeader } from '@/components/site/layout/SiteHeader'
import { SiteFooter } from '@/components/site/layout/SiteFooter'
import { SiteMotionGate, SiteMotionLive } from '@/components/site/motion/SiteMotionScript'

/**
 * Layout for the rebuilt public site.
 *
 * Route groups do not affect URLs, and two groups cannot own the same path —
 * so live pages (/, /services, …) stay in (marketing) until the launch phase
 * moves them here one by one. Until then this group holds only the local
 * design-system preview.
 *
 * Everything inside renders under [data-surface="site"], which is where the
 * --hb-* tokens, Manrope and the scoped base styles apply. The root layout's
 * global theme script and tokens are untouched; this surface simply does not
 * read them.
 *
 * Deliberately NOT here yet (decide before launch): analytics, cookie
 * consent, structured data, the service worker. The (marketing) layout keeps
 * all of them for the live routes.
 *
 * suppressHydrationWarning: the pre-paint motion gate adds data-motion-ready
 * to this element before React hydrates.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
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
    </div>
  )
}
