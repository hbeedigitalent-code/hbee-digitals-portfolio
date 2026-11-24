'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { SiteScene } from '../motion/SiteScene'
import { footerMotionMode } from './footer-motion-mode'
import styles from './site-footer.module.css'

/**
 * Wraps the shared crest + footer. It decides, per route, how much moves (footer-motion-mode.ts), runs the scroll-linked
 * footer entrance on the homepage only (a reversible SiteScene that settles by the time the footer is reached, and always at
 * the end of the page), and pauses the crest's ambient drift while the footer is well off-screen. The footer's markup is
 * rendered on the server; this only owns attributes.
 */
export function FooterMotion({ children }: { children: ReactNode }) {
  const mode = footerMotionMode(usePathname())
  const root = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = root.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) node.removeAttribute('data-offscreen')
        else node.setAttribute('data-offscreen', '')
      },
      { rootMargin: '25% 0px 25% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={root} className={styles.motion} data-crest={mode}>
      <SiteScene anchor="top" from={1} to={0.5} settleAtEnd disabled={mode !== 'full'} className={styles.scene}>
        {children}
      </SiteScene>
    </div>
  )
}
