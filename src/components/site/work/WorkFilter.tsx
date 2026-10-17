'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { workCategoryFromQuery } from '@/lib/site/work-filter'
import { SiteChevron } from '../primitives/SiteIcons'
import styles from './work.module.css'

export interface WorkFilterCategory {
  key: string
  label: string
  count: number
}

/**
 * Category filter for the Work collection — the page's only client code
 * beyond the shared nav. The project cards stay server-rendered (children);
 * this component only shows/hides them by their real `data-category` key.
 *
 *   ≥768px  a group of toggle buttons (aria-pressed), keyboard via Tab/Enter
 *   <768px  a native <select> (compact, 44px+)
 *
 * Items mark how they behave across views:
 *   data-view="all-only"       the featured block (All work only)
 *   data-view="filtered-only"  the featured project's grid card (filtered views)
 * The visible count is announced politely.
 */
export function WorkFilter({ categories, total, children }: { categories: WorkFilterCategory[]; total: number; children: ReactNode }) {
  const [active, setActive] = useState('all')
  const listRef = useRef<HTMLDivElement>(null)
  const count = active === 'all' ? total : categories.find((c) => c.key === active)?.count ?? 0

  useEffect(() => {
    const sync = () => setActive(workCategoryFromQuery(new URLSearchParams(window.location.search).get('category'), categories))
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [categories])

  function selectCategory(key: string) {
    setActive(key)
    const url = new URL(window.location.href)
    if (key === 'all') url.searchParams.delete('category')
    else url.searchParams.set('category', key)
    window.history.pushState(null, '', url)
  }

  useEffect(() => {
    const root = listRef.current
    if (!root) return
    root.querySelectorAll<HTMLElement>('[data-work-item]').forEach((el) => {
      const view = el.dataset.view
      const show = active === 'all' ? view !== 'filtered-only' : el.dataset.category === active && view !== 'all-only'
      el.hidden = !show
    })
  }, [active])

  const options = [{ key: 'all', label: 'All work', count: total }, ...categories]

  return (
    <>
      <div className={styles.controls}>
        <div role="group" aria-label="Filter work by category" className={styles.filterGroup}>
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={active === o.key}
              onClick={() => selectCategory(o.key)}
              className={cn(styles.filterButton, active === o.key && styles.filterButtonActive)}
            >
              {o.label}
              <span className={styles.filterCount}>
                <span className="sr-only">, </span>
                {o.count}
                <span className="sr-only"> {o.count === 1 ? 'project' : 'projects'}</span>
              </span>
            </button>
          ))}
        </div>

        <label className={styles.filterSelectWrap}>
          <span className="sr-only">Filter work by category</span>
          <select value={active} onChange={(e) => selectCategory(e.target.value)} className={styles.filterSelect}>
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
          <SiteChevron size={16} className={styles.filterSelectIcon} />
        </label>

        <p aria-live="polite" className={styles.filterStatus}>
          Showing {count} {count === 1 ? 'project' : 'projects'}
        </p>
      </div>

      <div ref={listRef}>{children}</div>
    </>
  )
}
