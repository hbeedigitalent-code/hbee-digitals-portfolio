'use client'

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type SiteMotion = 'reveal' | 'assemble' | 'shift' | 'left' | 'focus' | 'eyebrow' | 'headline' | 'soft' | 'item' | 'rule' | 'railv' | 'rail' | 'card' | 'visual' | 'step' | 'none'

/**
 * Reusable sequence presets for a reveal GROUP (a SiteReveal that triggers descendants).
 *   editorial  eyebrow → heading → body → CTA
 *   cards      heading, then each card in reading order
 *   system     heading → frame → connectors → modules → signal → caption
 *   process    heading → stage 1 … stage N (slower, ordered)
 * The preset only sets delay pacing (site-tokens.css); descendants still carry their own
 * data-motion + --hb-motion-index. Pacing shortens on phones.
 */
export type SiteSequence = 'editorial' | 'cards' | 'system' | 'process'

interface SiteRevealProps {
  /**
   * Motion applied to this element. Use `none` when the element is only a
   * trigger for descendants that carry their own data-motion / data-connect.
   */
  motion?: SiteMotion
  /** Stagger position (multiplied by --hb-stagger). */
  index?: number
  /** Pacing preset for the descendants this element triggers. */
  sequence?: SiteSequence
  as?: ElementType
  /** Optional element id (used for in-page anchors such as /how-we-work#assess). */
  id?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * ONE shared IntersectionObserver for every SiteReveal on the page (previously one per element).
 *
 * Elements that enter the viewport in the same observer batch are sequenced in READING ORDER
 * (row first, then left to right) through --hb-order, so a row of cards, or a heading followed by its
 * lede, arrives one after another no matter how many separate SiteReveals they are. A later row starts
 * again from 0 when it enters, so six cards never wait for each other's cumulative index.
 */
const callbacks = new WeakMap<Element, () => void>()
let shared: IntersectionObserver | null = null

function observer(): IntersectionObserver {
  if (shared) return shared
  shared = new IntersectionObserver(
    (entries) => {
      // Also reveal anything the visitor has already scrolled past (a fast scroll or an anchor jump can skip
      // the intersecting frame), so nothing above the viewport is ever left hidden.
      const hits = entries.filter((entry) => entry.isIntersecting || entry.boundingClientRect.bottom < 0)
      if (hits.length === 0) return
      hits
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.round(a.boundingClientRect.top / 48) - Math.round(b.boundingClientRect.top / 48) || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((entry, order) => (entry.target as HTMLElement).style.setProperty('--hb-order', String(order)))
      hits
        .filter((entry) => !entry.isIntersecting)
        .forEach((entry) => (entry.target as HTMLElement).style.setProperty('--hb-order', '0'))
      for (const entry of hits) {
        callbacks.get(entry.target)?.()
        callbacks.delete(entry.target)
        shared?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
  )
  return shared
}

/**
 * Viewport-triggered motion with no animation library.
 *
 * All visual states live in site-tokens.css; this component only flips
 * data-revealed once. If the surface is not motion-ready (reduced motion, no
 * IntersectionObserver, or a client-side navigation into the surface) the
 * element is marked revealed immediately and never hidden.
 */
export function SiteReveal({ motion = 'reveal', index, sequence, as: Tag = 'div', id, className, style, children }: SiteRevealProps) {
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

    const io = observer()
    callbacks.set(node, () => setRevealed(true))
    io.observe(node)
    return () => {
      callbacks.delete(node)
      io.unobserve(node)
    }
  }, [])

  return (
    <Tag
      ref={ref}
      id={id}
      data-motion={motion === 'none' ? undefined : motion}
      data-sequence={sequence}
      data-revealed={revealed ? 'true' : 'false'}
      className={cn(className)}
      style={index !== undefined ? ({ ...style, '--hb-motion-index': index } as CSSProperties) : style}
    >
      {children}
    </Tag>
  )
}
