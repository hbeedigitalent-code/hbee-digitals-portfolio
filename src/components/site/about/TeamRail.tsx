'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import styles from './about.module.css'

/**
 * Supporting team profiles. On phones (with three or more profiles) the list
 * becomes a user-controlled horizontal rail: native swipe + scroll-snap, and
 * previous/next buttons. Nothing moves on its own. When the rail actually
 * overflows it becomes a keyboard-focusable region (arrow keys scroll it);
 * on wider screens it is a plain grid with no extra tab stop.
 */
export function TeamRail({ count, scrollable, children }: { count: number; scrollable: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)
  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false })

  useEffect(() => {
    const node = ref.current
    if (!node || !scrollable) return
    const update = () => {
      const max = node.scrollWidth - node.clientWidth
      setOverflow(max > 2)
      setEdge({ start: node.scrollLeft <= 2, end: node.scrollLeft >= max - 2 })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(node)
    node.addEventListener('scroll', update, { passive: true })
    return () => {
      ro.disconnect()
      node.removeEventListener('scroll', update)
    }
  }, [scrollable])

  const step = (dir: 1 | -1) => {
    const node = ref.current
    const card = node?.querySelector('li')
    if (!node || !card) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    node.scrollBy({ left: dir * (card.getBoundingClientRect().width + 12), behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <div className={styles.teamRailWrap}>
      <div
        ref={ref}
        className={cn(styles.teamRail, scrollable && styles.teamRailScroll)}
        {...(overflow ? { tabIndex: 0, role: 'region', 'aria-label': `Team members, ${count} profiles — scroll horizontally` } : {})}
      >
        {children}
      </div>
      {scrollable && (
        <div className={styles.teamRailControls} hidden={!overflow}>
          <button type="button" className={styles.teamRailButton} onClick={() => step(-1)} disabled={edge.start} aria-label="Previous team members">
            <ChevronLeft aria-hidden="true" focusable="false" size={20} strokeWidth={2} />
          </button>
          <button type="button" className={styles.teamRailButton} onClick={() => step(1)} disabled={edge.end} aria-label="Next team members">
            <ChevronRight aria-hidden="true" focusable="false" size={20} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
