import { HbeeLogo } from '../brand/HbeeLogo'
import { SiteNav } from './SiteNav'

/**
 * Public-site header. Independent of components/Navbar.tsx, which stays
 * untouched and keeps serving the live (marketing) routes until launch.
 *
 * Light by design — the public site is Cloud-led. A translucent Cloud bar is
 * the one place the header uses glass, as supporting material over scrolling
 * content. The blur lives on a ::before layer, not the header itself:
 * backdrop-filter on the header would make it the containing block for the
 * fixed-position mobile menu panel and trap that panel inside the bar.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hb-border before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[rgba(247,249,252,0.88)] before:backdrop-blur-md before:content-['']">
      {/* Compact desktop: tighter gaps so the full navigation stays on one line —
          1152–1279px one step, 1024–1151px one more. 1280px+ is unchanged. */}
      <div className="hb-container flex h-[var(--hb-header-height)] items-center justify-between gap-6 lg:max-[1279px]:gap-4 lg:max-[1151px]:gap-3">
        <div className="shrink-0">
          <HbeeLogo priority className="whitespace-nowrap" />
        </div>
        <SiteNav />
      </div>
    </header>
  )
}
