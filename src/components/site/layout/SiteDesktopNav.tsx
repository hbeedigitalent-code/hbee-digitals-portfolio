'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { NAV_MENUS, PRIMARY_NAV, type NavMenu, type NavMenuAside, type NavMenuColumn } from '../navigation'
import { SiteButton } from '../primitives/SiteButton'
import { SiteArrow, SiteChevron } from '../primitives/SiteIcons'
import styles from './site-nav.module.css'

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Hover intent before opening, and grace before closing, so crossing the
 *  gap between a trigger and its panel never drops the menu. */
const OPEN_DELAY = 80
const CLOSE_DELAY = 220
/** A click this soon after a hover-open confirms the menu instead of closing it. */
const HOVER_CLICK_GRACE = 700

const DEPTH_PADDING: Record<NavMenu['depth'], string> = {
  deep: 'py-10',
  medium: 'py-9',
  compact: 'py-7',
}

/**
 * Desktop primary navigation (≥1024px): ONE mega-menu system for every
 * primary item, with content-driven depth.
 *
 * Every trigger is a disclosure button (aria-expanded / aria-controls) with a
 * real SVG chevron. Each panel follows its trigger in DOM order, so Tab moves
 * from the trigger straight into its panel. All panels open beneath the same
 * header, span the viewport, and lay their content on the shared 1320px
 * container grid; only the content differs, so heights differ naturally.
 *
 * Open: click / Enter / Space, or hover with intent. Only one panel is ever
 * active. Close: Escape (focus returns to the trigger), click outside, focus
 * leaving the nav, pointer leaving after a grace period, or navigation.
 * Closed panels are visibility:hidden — out of the tab order and the
 * accessibility tree — while their exit still animates.
 */
export function SiteDesktopNav({ pathname }: { pathname: string }) {
  const [active, setActive] = useState<string | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const timer = useRef<number | null>(null)
  /** When hover last opened a panel — a click right after it must not toggle it shut. */
  const hoverOpenedAt = useRef(0)

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  const schedule = useCallback((next: string | null, delay: number) => {
    clearTimer()
    timer.current = window.setTimeout(() => {
      if (next) hoverOpenedAt.current = Date.now()
      setActive(next)
    }, delay)
  }, [])

  useEffect(() => {
    clearTimer()
    setActive(null)
  }, [pathname])

  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const trigger = triggerRefs.current[active]
        clearTimer()
        setActive(null)
        trigger?.focus()
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        clearTimer()
        setActive(null)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [active])

  useEffect(() => () => clearTimer(), [])

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className="hidden lg:block"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          clearTimer()
          setActive(null)
        }
      }}
    >
      <ul className="flex items-center gap-1 lg:max-[1279px]:gap-0.5">
        {PRIMARY_NAV.map((item) => {
          const menu = NAV_MENUS[item.href]
          const current = isActive(pathname, item.href)
          const open = active === item.href
          const triggerClasses = cn(
            'group/trigger relative inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap px-3.5 text-[0.9375rem] font-medium text-hb-fg-body transition-colors duration-[var(--hb-dur-fast)] hover:text-hb-fg lg:max-[1279px]:gap-1 lg:max-[1279px]:px-2.5 lg:max-[1151px]:px-2',
            'after:absolute after:inset-x-3.5 lg:max-[1279px]:after:inset-x-2.5 lg:max-[1151px]:after:inset-x-2 after:bottom-2 after:h-[2px] after:origin-left after:scale-x-0 after:bg-hb-structure after:transition-transform after:duration-[var(--hb-dur-base)] after:ease-[var(--hb-ease)] hover:after:scale-x-100',
            (current || open) && 'text-hb-fg after:scale-x-100',
          )

          if (!menu) {
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={current ? 'page' : undefined} className={triggerClasses}>
                  {item.label}
                </Link>
              </li>
            )
          }

          const panelId = `site-menu-${item.href.replace(/\W/g, '')}`
          return (
            <li
              key={item.href}
              onPointerEnter={(e) => e.pointerType === 'mouse' && schedule(item.href, active ? 0 : OPEN_DELAY)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && schedule(null, CLOSE_DELAY)}
            >
              <button
                ref={(el) => {
                  triggerRefs.current[item.href] = el
                }}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                aria-current={current ? 'page' : undefined}
                onFocus={() => {
                  // Tabbing onto another trigger closes the panel being left behind.
                  if (active && active !== item.href) {
                    clearTimer()
                    setActive(null)
                  }
                }}
                onClick={() => {
                  clearTimer()
                  // A mouse user usually hovers, the panel opens, then they click
                  // the same trigger. Treat that click as confirmation, not a toggle.
                  if (open && Date.now() - hoverOpenedAt.current < HOVER_CLICK_GRACE) return
                  setActive(open ? null : item.href)
                }}
                className={triggerClasses}
              >
                {item.label}
                <SiteChevron
                  size={14}
                  className={cn('transition-transform duration-200 ease-[var(--hb-ease)]', open && 'rotate-180')}
                />
              </button>
              <MegaPanel id={panelId} menu={menu} open={open} />
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* ── Panel ─────────────────────────────────────────────────────── */

/**
 * Stagger plan, computed purely from the menu data so server and client
 * render identical --i values (a counter mutated during render does not:
 * child components render after the parent, in a different order).
 */
function staggerPlan(menu: NavMenu) {
  let i = 0
  const columns = menu.columns.map((column) => {
    const title = column.title ? i++ : -1
    const first = i
    i += column.links.length
    return { title, first }
  })
  const overview = menu.overview ? i++ : -1
  const aside = i + 1 // supporting/focal area arrives last
  return { columns, overview, aside }
}

function MegaPanel({ id, menu, open }: { id: string; menu: NavMenu; open: boolean }) {
  const plan = staggerPlan(menu)
  const totalSpan = menu.columns.reduce((sum, c) => sum + (c.span ?? 1), 0)
  // Same 12-column grid for every panel: primary 8 / aside 4 unless the menu
  // sets a narrower split. Inline spans, since Tailwind can't see dynamic class names.
  const split = menu.split ?? { primary: 8, aside: 4 }
  const primaryStyle = { gridColumn: `span ${menu.aside ? split.primary : 12} / span ${menu.aside ? split.primary : 12}` }
  const asideStyle = { gridColumn: `span ${split.aside} / span ${split.aside}` }

  return (
    <div id={id} data-state={open ? 'open' : 'closed'} className={cn(styles.menuPanel, styles.menuMega)}>
      <div className={cn('hb-container grid grid-cols-12 gap-x-[var(--hb-grid-gap)]', DEPTH_PADDING[menu.depth])}>
        <div style={primaryStyle}>
          <div
            className="grid gap-x-[var(--hb-grid-gap)] gap-y-6"
            style={{ gridTemplateColumns: `repeat(${totalSpan}, minmax(0, 1fr))` }}
          >
            {menu.columns.map((column, c) => (
              <div key={column.title ?? c} style={{ gridColumn: `span ${column.span ?? 1}` }}>
                {column.title && (
                  <p className={cn(styles.menuItem, styles.menuGroupTitle)} style={{ '--i': plan.columns[c].title } as CSSProperties}>
                    {column.title}
                  </p>
                )}
                <MenuColumn column={column} first={plan.columns[c].first} />
              </div>
            ))}
          </div>

          {menu.overview && (
            <div className={cn(styles.menuItem, 'mt-6 border-t border-hb-border pt-3')} style={{ '--i': plan.overview } as CSSProperties}>
              <Link href={menu.overview.href} className={styles.menuAction}>
                {menu.overview.label}
                <SiteArrow size={15} className={styles.menuActionArrow} />
              </Link>
            </div>
          )}
        </div>

        {menu.aside && (
          <MenuAside aside={menu.aside} style={asideStyle} index={plan.aside} />
        )}
      </div>
    </div>
  )
}

function MenuColumn({ column, first }: { column: NavMenuColumn; first: number }) {
  const item = (n: number, key: string, child: ReactNode, className?: string) => (
    <li key={key} className={cn(styles.menuItem, className)} style={{ '--i': first + n } as CSSProperties}>
      {child}
    </li>
  )

  if (column.layout === 'stack') {
    return (
      <ul className="mt-4 flex flex-col gap-1">
        {column.links.map((link, n) =>
          item(
            n,
            link.href,
            // Only the title is link text; a stretched hit area keeps the whole
            // item clickable. The description sits OUTSIDE the anchor, so forced
            // link underlines (browser/accessibility settings) never reach it.
            <div className={styles.menuStackLink}>
              <Link href={link.href} className={cn(styles.stretchedLink, 'block font-hb-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-hb-fg')}>
                {link.label}
              </Link>
              {link.description && <p className="mt-1 text-[0.875rem] leading-snug text-hb-fg-body">{link.description}</p>}
            </div>,
          ),
        )}
      </ul>
    )
  }

  if (column.layout === 'steps') {
    return (
      <ol className="mt-4 grid grid-cols-5 gap-x-[var(--hb-grid-gap)]">
        {column.links.map((link, i) =>
          item(
            i,
            link.href,
            <div className={styles.menuStepLink}>
              <span aria-hidden="true" className="text-[0.75rem] font-semibold tabular-nums tracking-[0.08em] text-hb-link">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Link href={link.href} className={cn(styles.stretchedLink, 'mt-1.5 block font-hb-display text-[1rem] font-semibold tracking-[-0.01em] text-hb-fg')}>
                {link.label}
              </Link>
              {link.description && <p className="mt-1 text-[0.8125rem] leading-snug text-hb-fg-body">{link.description}</p>}
            </div>,
          ),
        )}
      </ol>
    )
  }

  return (
    <ul
      className={cn(
        'mt-3',
        column.layout === 'grid'
          ? cn('grid gap-x-[var(--hb-grid-gap)]', column.perRow === 3 ? 'grid-cols-3' : 'grid-cols-2')
          : 'flex flex-col',
      )}
    >
      {column.links.map((link, n) =>
        item(
          n,
          link.href,
          <Link href={link.href} className={styles.menuLink}>
            {link.label}
          </Link>,
        ),
      )}
    </ul>
  )
}

function MenuAside({ aside, style: placement, index }: { aside: NavMenuAside; style: CSSProperties; index: number }) {
  const style = { ...placement, '--i': index } as CSSProperties

  if (aside.emphasis === 'branded') {
    return (
      <aside className={cn(styles.menuItem, styles.menuFocus, styles.menuFeature)} style={style}>
        <span aria-hidden="true" className={styles.featureStem} />
        <span aria-hidden="true" className={styles.featureSignal} />
        {aside.title && <p className="font-hb-display text-[1.375rem] font-bold tracking-[-0.02em] text-hb-fg">{aside.title}</p>}
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-hb-fg-body">{aside.text}</p>
        {aside.cta && (
          <SiteButton href={aside.cta.href} variant={aside.cta.variant} arrow className="mt-6">
            {aside.cta.label}
          </SiteButton>
        )}
      </aside>
    )
  }

  return (
    <aside className={cn(styles.menuItem, styles.menuFocus, styles.menuNote)} style={style}>
      {aside.emphasis === 'node' && <span aria-hidden="true" className={styles.noteNode} />}
      {aside.title && (
        <p className="font-hb-body text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-fg-muted">
          {aside.title}
        </p>
      )}
      <p
        className={cn(
          'font-hb-display font-semibold leading-snug tracking-[-0.015em] text-hb-fg',
          aside.title ? 'mt-3 text-[1.0625rem]' : 'text-[1.25rem]',
        )}
      >
        {aside.text}
      </p>
      {aside.cta && (
        <SiteButton href={aside.cta.href} variant={aside.cta.variant} arrow className="mt-5">
          {aside.cta.label}
        </SiteButton>
      )}
    </aside>
  )
}
