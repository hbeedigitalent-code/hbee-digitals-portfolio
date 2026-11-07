'use client'

import { useEffect, useRef } from 'react'
import { readingProgress } from './reading-progress'
import styles from './insights.module.css'

/**
 * Thin reading-progress line for /insights/[slug]. Decorative orientation aid:
 * aria-hidden, no text, no live announcements, pointer-events none.
 *
 * Mounted as a zero-height sticky anchor directly under the site header, so it
 * rides the header's bottom edge without a second sticky header, a hard-coded
 * offset or any layout shift. Progress is measured against the article element
 * only (see reading-progress.ts) and written straight to a transform, so
 * scrolling causes no React re-renders. It tracks scroll position directly and
 * has no transition, so prefers-reduced-motion needs no separate path.
 */
export function InsightReadingProgress({ articleId }: { articleId: string }) {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const barEl = bar.current
    const article = document.getElementById(articleId)
    if (!barEl || !article) return
    const header = document.querySelector<HTMLElement>('[data-surface="site"] > header')
    let frame = 0

    const update = () => {
      frame = 0
      const rect = article.getBoundingClientRect()
      const progress = readingProgress({
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        headerHeight: header?.getBoundingClientRect().height ?? 0,
        articleTop: rect.top + window.scrollY,
        articleHeight: rect.height,
      })
      barEl.style.transform = `scaleX(${progress})`
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    // Article height changes (images, responsive wrapping) and anything above it
    // moving (hero image) both change the measurements.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    observer?.observe(article)
    const main = article.closest('main')
    if (main) observer?.observe(main)
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) schedule()
    })

    return () => {
      cancelled = true
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [articleId])

  return (
    <div aria-hidden="true" className={styles.progress}>
      <div ref={bar} className={styles.progressBar} />
    </div>
  )
}
