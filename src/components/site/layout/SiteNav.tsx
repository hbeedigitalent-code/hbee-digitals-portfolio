'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { NAV_MENUS, PRIMARY_CTA, PRIMARY_NAV, UTILITY_NAV, type NavMenu, type SiteLink } from '../navigation'
import { SiteButton } from '../primitives/SiteButton'
import { SiteArrow, SiteChevron } from '../primitives/SiteIcons'
import { useReducedMotion } from '../motion/useReducedMotion'
import styles from './site-nav.module.css'
import { SiteDesktopNav } from './SiteDesktopNav'

/** How long the panel stays mounted while its exit plays (see site-nav.module.css). */
const CLOSE_MS = 260

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Desktop (≥1024px): inline primary nav · Client Portal utility · conversion CTA.
 * Below 1024px: CTA stays visible from ≥640px; everything else moves into a
 * full-height disclosure panel. Escape closes and returns focus to the toggle;
 * the panel closes on navigation; page scroll is locked while open.
 *
 * Motion (REVEAL → SHIFT → FOCUS) is CSS-only, driven by data-state. The
 * panel stays mounted for CLOSE_MS after closing so its exit can play;
 * `open` is the logical state (aria-expanded, focus, scroll lock) and
 * `rendered` / `entered` only stage the animation.
 */
export function SiteNav() {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [entered, setEntered] = useState(false)
  const reducedMotion = useReducedMotion()
  const panelId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const exitTimer = useRef<number | null>(null)

  const clearExit = () => {
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current)
      exitTimer.current = null
    }
  }

  const openMenu = useCallback(() => {
    clearExit()
    setRendered(true)
    setOpen(true)
  }, [])

  const close = useCallback(
    (restoreFocus = true) => {
      setOpen(false)
      setEntered(false)
      clearExit()
      exitTimer.current = window.setTimeout(() => setRendered(false), reducedMotion ? 0 : CLOSE_MS)
      if (restoreFocus) toggleRef.current?.focus()
    },
    [reducedMotion],
  )

  // Navigating away closes immediately — no exit to watch.
  useEffect(() => {
    clearExit()
    setOpen(false)
    setEntered(false)
    setRendered(false)
  }, [pathname])

  // Two frames after mounting, flip to the open state so the entry transitions run.
  useEffect(() => {
    if (!open || !rendered) return
    let second = 0
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      window.cancelAnimationFrame(first)
      window.cancelAnimationFrame(second)
    }
  }, [open, rendered])

  useEffect(() => () => clearExit(), [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) close(false)
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open, close])

  return (
    <>
      <SiteDesktopNav pathname={pathname} />

      <div className="flex items-center gap-2 lg:gap-5">
        <Link
          href={UTILITY_NAV.href}
          className="hidden min-h-[44px] items-center text-[0.875rem] font-medium text-hb-fg-body hover:text-hb-fg lg:inline-flex"
        >
          {UTILITY_NAV.label}
        </Link>
        <SiteButton href={PRIMARY_CTA.href} variant="conversion" className="hidden sm:inline-flex">
          {PRIMARY_CTA.label}
        </SiteButton>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => (open ? close() : openMenu())}
          className={cn(
            styles.toggle,
            'relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--hb-radius-md)] text-hb-fg transition-colors hover:bg-hb-plane lg:hidden',
          )}
        >
          {/* Reserved for a future brief activation (see .activation). Idle in Phase 2. */}
          <span aria-hidden="true" data-activation="idle" className={styles.activation} />
          <span aria-hidden="true" className={styles.icon}>
            <span className={cn(styles.bar, styles.barTop)} />
            <span className={cn(styles.bar, styles.barMid)} />
            <span className={cn(styles.bar, styles.barBottom)} />
          </span>
        </button>
      </div>

      {rendered && (
        <div aria-hidden="true" data-state={entered ? 'open' : 'closed'} className={cn(styles.overlay, 'lg:hidden')} />
      )}

      {rendered && (
        <div
          id={panelId}
          ref={panelRef}
          data-state={entered ? 'open' : 'closed'}
          aria-hidden={open ? undefined : true}
          className={cn(
            styles.panel,
            'fixed inset-x-0 bottom-0 top-[var(--hb-header-height)] z-40 overflow-y-auto border-t border-hb-border bg-hb-cloud lg:hidden',
          )}
        >
          <nav aria-label="Primary" className="hb-container flex min-h-full flex-col py-8">
            <ul className="flex flex-col">
              {PRIMARY_NAV.map((item, index) => {
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href} className={cn(styles.item, 'border-b border-hb-border')} style={{ '--i': index } as CSSProperties}>
                    {NAV_MENUS[item.href] ? (
                      <MobileAccordion item={item} menu={NAV_MENUS[item.href]} active={active} />
                    ) : (
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-[60px] items-center justify-between font-hb-display text-[1.625rem] font-semibold tracking-[-0.02em] text-hb-fg',
                        active && 'text-hb-blue',
                      )}
                    >
                      {item.label}
                      {active && <span aria-hidden="true" className="h-2.5 w-5 rounded-l-[2px] rounded-r-full bg-hb-signal" />}
                    </Link>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="mt-auto flex flex-col gap-3 pt-10">
              {/* FOCUS: the conversion CTA lands after the links; Client Portal follows. */}
              <div className={cn(styles.item, styles.focus)} style={{ '--i': PRIMARY_NAV.length + 1 } as CSSProperties}>
                <SiteButton href={PRIMARY_CTA.href} variant="conversion" size="lg" arrow className="w-full">
                  {PRIMARY_CTA.label}
                </SiteButton>
              </div>
              <div className={styles.item} style={{ '--i': PRIMARY_NAV.length + 2 } as CSSProperties}>
                <SiteButton href={UTILITY_NAV.href} variant="secondary" size="lg" className="w-full">
                  {UTILITY_NAV.label}
                </SiteButton>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}

/**
 * Mobile submenu: an accessible accordion inside the full-screen menu — never
 * the desktop mega-panel. Same information architecture as desktop, laid out
 * vertically: each column's links (with its title), stages with their short
 * line, then the overview action. Supporting notes stay desktop-only, except
 * a secondary action (e.g. Talk to Hbee), which is kept.
 */
function MobileAccordion({ item, menu, active }: { item: SiteLink; menu: NavMenu; active: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  const secondary = menu.aside?.cta && menu.aside.cta.variant !== 'conversion' ? menu.aside.cta : null

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex min-h-[60px] w-full items-center justify-between text-left font-hb-display text-[1.625rem] font-semibold tracking-[-0.02em] text-hb-fg',
          active && 'text-hb-blue',
        )}
      >
        {item.label}
        <SiteChevron size={20} className={cn('transition-transform duration-200 ease-[var(--hb-ease)]', expanded && 'rotate-180')} />
      </button>
      <div id={bodyId} data-open={expanded} className={styles.accordionBody}>
        <div className={styles.accordionInner}>
          <div className="flex flex-col pb-5">
            {menu.columns.map((column, c) => (
              <div key={column.title ?? c} className={c > 0 ? 'mt-3' : undefined}>
                {column.title && (
                  <p className="pb-1 pt-2 text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-fg-muted">
                    {column.title}
                  </p>
                )}
                <ul>
                  {column.links.map((link, i) => (
                    <li key={link.href} className="relative py-1.5">
                      {/* Title is the link (stretched over the row); the stage summary stays plain text. */}
                      <Link
                        href={link.href}
                        className="flex min-h-[32px] items-baseline gap-2.5 text-[1.0625rem] text-hb-fg after:absolute after:inset-0 after:content-['']"
                      >
                        {column.layout === 'steps' && (
                          <span aria-hidden="true" className="text-[0.75rem] font-semibold tabular-nums tracking-[0.08em] text-hb-link">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        )}
                        {link.label}
                      </Link>
                      {column.layout === 'steps' && link.description && (
                        <p className="mt-0.5 pl-[1.875rem] text-[0.875rem] leading-snug text-hb-fg-body">{link.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {menu.overview && (
              <Link href={menu.overview.href} className="group/action mt-3 inline-flex min-h-[44px] items-center gap-2 font-semibold text-hb-link">
                {menu.overview.label}
                <SiteArrow size={16} className="transition-transform duration-[var(--hb-dur-base)] group-hover/action:translate-x-[3px]" />
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href} className="group/action mt-1 inline-flex min-h-[44px] items-center gap-2 font-semibold text-hb-link">
                {secondary.label}
                <SiteArrow size={16} className="transition-transform duration-[var(--hb-dur-base)] group-hover/action:translate-x-[3px]" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
