'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { PRIMARY_CTA, PRIMARY_NAV, UTILITY_NAV } from '../navigation'
import { SiteButton } from '../primitives/SiteButton'
import { useReducedMotion } from '../motion/useReducedMotion'
import styles from './site-nav.module.css'

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
      <nav aria-label="Primary" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex min-h-[44px] items-center px-3.5 text-[0.9375rem] font-medium text-hb-fg-body transition-colors duration-[var(--hb-dur-fast)] hover:text-hb-fg',
                    'after:absolute after:inset-x-3.5 after:bottom-2 after:h-[2px] after:origin-left after:scale-x-0 after:bg-hb-structure after:transition-transform after:duration-[var(--hb-dur-base)] after:ease-[var(--hb-ease)] hover:after:scale-x-100',
                    active && 'text-hb-fg after:scale-x-100',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

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
            'inline-flex h-11 w-11 items-center justify-center rounded-[var(--hb-radius-md)] text-hb-fg transition-colors hover:bg-hb-plane lg:hidden',
          )}
        >
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
