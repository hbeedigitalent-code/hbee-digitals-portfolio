'use client'

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { insightFilterState, insightFilterUrl } from '@/lib/site/insights-filter'
import { cn } from '@/lib/cn'
import styles from './insights.module.css'

export interface BrowserTopic {
  key: string
  label: string
  count: number
}

/**
 * Search + topic filter for the Insights collection — the landing page's only
 * client code beyond the shared nav. Cards stay server-rendered (children);
 * this component only shows/hides them using their real data attributes:
 *   data-insight=""        a filterable card
 *   data-search="…"        lower-cased title + excerpt + topics (public fields only)
 *   data-topics="k1|k2"    the card's topic keys
 *   data-view="filtered-only"  the lead article's grid copy (hidden in the default view)
 */
export function InsightsBrowser({ topics, total, children }: { topics: BrowserTopic[]; total: number; children: ReactNode }) {
  return <Suspense fallback={children}><InsightsBrowserControls topics={topics} total={total}>{children}</InsightsBrowserControls></Suspense>
}

function InsightsBrowserControls({ topics, total, children }: { topics: BrowserTopic[]; total: number; children: ReactNode }) {
  const searchParams = useSearchParams()
  const searchKey = searchParams?.toString() || ''
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('all')
  const [count, setCount] = useState(total)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => {
      const state = insightFilterState(new URLSearchParams(window.location.search), topics)
      setQuery(state.query); setTopic(state.topic)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [searchKey, topics])

  function updateFilters(nextTopic: string, nextQuery: string, replace = false) {
    setTopic(nextTopic); setQuery(nextQuery)
    const url = insightFilterUrl(window.location.href, nextTopic, nextQuery)
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url)
  }

  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const q = query.trim().toLowerCase()
    const filtering = q !== '' || topic !== 'all'
    let n = 0
    root.querySelectorAll<HTMLElement>('[data-insight]').forEach((el) => {
      if (!filtering) {
        el.hidden = el.dataset.view === 'filtered-only'
        if (!el.hidden) n++
        return
      }
      if (el.dataset.view === 'all-only') {
        el.hidden = true
        return
      }
      const okTopic = topic === 'all' || (el.dataset.topics ?? '').split('|').includes(topic)
      const okQuery = !q || (el.dataset.search ?? '').includes(q)
      el.hidden = !(okTopic && okQuery)
      if (!el.hidden) n++
    })
    setCount(n)
  }, [query, topic, children])

  const options = [{ key: 'all', label: 'All topics', count: total }, ...topics]

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
            onChange={(e) => updateFilters(topic, e.target.value, true)}
            placeholder="Search insights"
            className={styles.searchInput}
          />
        </label>
        {topics.length > 0 && (
          <div role="group" aria-label="Browse by topic" className={styles.topics}>
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                aria-pressed={topic === o.key}
                onClick={() => updateFilters(o.key, query)}
                className={cn(styles.topic, topic === o.key && styles.topicActive)}
              >
                {o.label}
                <span className={styles.topicCount}>
                  <span className="sr-only">, </span>
                  {o.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p aria-live="polite" className={styles.status}>
        {count === 0 ? 'No insights match your search.' : `Showing ${count} ${count === 1 ? 'insight' : 'insights'}`}
      </p>
      <div ref={listRef}>{children}</div>
      {count === 0 && (
        <div className={styles.noResults}>
          <p className="font-hb-display text-[1.25rem] font-bold text-hb-fg">No insights match that search.</p>
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              updateFilters('all', '')
            }}
          >
            Clear search and topics
          </button>
        </div>
      )}
    </>
  )
}
