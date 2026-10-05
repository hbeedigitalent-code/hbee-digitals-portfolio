'use client'

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type SiteMotion = 'reveal' | 'assemble' | 'shift' | 'focus' | 'none'

interface SiteRevealProps {
  /**
   * Motion applied to this element. Use `none` when the element is only a
   * trigger for descendants that carry their own data-motion / data-connect.
   */
  motion?: SiteMotion
  /** Stagger position (multiplied by --hb-stagger). */
  index?: number
  as?: ElementType
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Viewport-triggered motion with no animation library.
 *
 * All visual states live in site-tokens.css; this component only flips
 * data-revealed once. If the surface is not motion-ready (reduced motion, no
 * IntersectionObserver, or a client-side navigation into the surface) the
 * element is marked revealed immediately and never hidden.
 */
export function SiteReveal({ motion = 'reveal', index, as: Tag = 'div', className, style, children }: SiteRevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const root = node.closest('[data-surface-root]')
    if (!root?.hasAttribute('data-motion-ready') || typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      data-motion={motion === 'none' ? undefined : motion}
      data-revealed={revealed ? 'true' : 'false'}
      className={cn(className)}
      style={index !== undefined ? ({ ...style, '--hb-motion-index': index } as CSSProperties) : style}
    >
      {children}
    </Tag>
  )
}
