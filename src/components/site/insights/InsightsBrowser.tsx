'use client'

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { INSIGHT_CAPABILITIES, insightCapabilityHref } from '@/lib/site/insight-capabilities'
import { insightFilterState, insightFilterUrl, matchesCapability } from '@/lib/site/insights-filter'
import { cn } from '@/lib/cn'
import styles from './insights.module.css'

/**
 * Capability navigation. These are real links (/insights?capability=…) so they exist in
 * the server-rendered HTML and work without JavaScript; once the page hydrates,
 * InsightsBrowser intercepts the click and filters in place.
 */
function CapabilityFilters({ active, onSelect }: { active: string; onSelect?: (capability: string) => void }) {
  const options = [
    { slug: 'all', name: 'All insights', href: '/insights' },
    ...INSIGHT_CAPABILITIES.map((c) => ({ slug: c.slug, name: c.name, href: insightCapabilityHref(c.slug) })),
  ]
  return (
    <nav aria-label="Browse insights by capability" className={styles.capNav}>
      <p className={styles.capNavLabel}>Browse by capability</p>
      <ul className={styles.topics}>
        {options.map((o) => (
          <li key={o.slug}>
            <a
              href={`${o.href}#insights-collection`}
              aria-current={active === o.slug ? 'true' : undefined}
              onClick={
                onSelect
                  ? (event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                      event.preventDefault()
                      onSelect(o.slug)
                    }
                  : undefined
              }
              className={cn(styles.topic, active === o.slug && styles.topicActive)}
            >
              {o.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Capability links (server-visible) + search for the Insights collection. Cards stay
 * server-rendered (children); this component only shows/hides them using their real
 * data attributes:
 *   data-insight=""            a filterable card
 *   data-search="…"            lower-cased title + excerpt + topic (public fields only)
 *   data-capabilities="a|b"    the code-side primary / secondary capability slugs
 *   data-view="filtered-only"  the lead article's grid copy (hidden in the default view)
 */
export function InsightsBrowser({ total, children }: { total: number; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <>
          <div className={styles.controls}>
            <div aria-hidden="true" className={styles.searchSlot} />
            <CapabilityFilters active="all" />
          </div>
          {children}
        </>
      }
    >
      <InsightsBrowserControls total={total}>{children}</InsightsBrowserControls>
    </Suspense>
  )
}

function InsightsBrowserControls({ total, children }: { total: number; children: ReactNode }) {
  const searchParams = useSearchParams()
  const searchKey = searchParams?.toString() || ''
  const [query, setQuery] = useState('')
  const [capability, setCapability] = useState('all')
  const [count, setCount] = useState(total)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => {
      const state = insightFilterState(new URLSearchParams(window.location.search))
      setQuery(state.query)
      setCapability(state.capability)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [searchKey])

  function updateFilters(nextCapability: string, nextQuery: string, replace = false) {
    setCapability(nextCapability)
    setQuery(nextQuery)
    const url = insightFilterUrl(window.location.href, nextCapability, nextQuery)
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url)
  }

  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const q = query.trim().toLowerCase()
    const filtering = q !== '' || capability !== 'all'
    let n = 0
    root.querySelectorAll<HTMLElement>('[data-insight]').forEach((el) => {
      if (!filtering) {
        el.hidden = el.dataset.view === 'filtered-only'
        if (!el.hidden) n++
        return
      }
      const okCapability = matchesCapability(el.dataset.capabilities, capability)
      const okQuery = !q || (el.dataset.search ?? '').includes(q)
      el.hidden = !(okCapability && okQuery)
      if (!el.hidden) n++
    })
    setCount(n)
  }, [query, capability, children])

  return (
    <>
      <div className={styles.controls}>
        <label className={styles.search}>
          <span className="sr-only">Search insights</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => updateFilters(capability, e.target.value, true)}
            placeholder="Search insights"
            className={styles.searchInput}
          />
        </label>
        <CapabilityFilters active={capability} onSelect={(next) => updateFilters(next, query)} />
      </div>
      <p aria-live="polite" className={styles.status}>
        {count === 0 ? 'No insights match your search.' : `Showing ${count} ${count === 1 ? 'insight' : 'insights'}`}
      </p>
      <div ref={listRef}>{children}</div>
      {count === 0 && (
        <div className={styles.noResults}>
          <p className="font-hb-display text-[1.25rem] font-bold text-hb-fg">No insights match that search.</p>
          <button type="button" className={styles.reset} onClick={() => updateFilters('all', '')}>
            Clear search and filters
          </button>
        </div>
      )}
    </>
  )
}
