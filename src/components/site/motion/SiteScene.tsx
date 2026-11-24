'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { registerScene } from './scene-controller'
import type { SceneAnchor } from './scene-progress'

interface SceneWindow {
  anchor?: SceneAnchor
  from?: number
  to?: number
}

interface SiteSceneProps {
  as?: ElementType
  id?: string
  className?: string
  style?: CSSProperties
  /** Tracked edge of the scene. Default: center. */
  anchor?: SceneAnchor
  /** Viewport fraction (0 top … 1 bottom) where the anchor sits at progress 0. */
  from?: number
  /** Viewport fraction where the anchor sits at progress 1. */
  to?: number
  /** Finish at 1 when the page cannot scroll further (a short final scene). */
  settleAtEnd?: boolean
  /** Overrides applied below 1024px, where the same scene is usually a taller, single-column stack. */
  compact?: SceneWindow
  /** Render as a plain element: no scene attribute (so no start state), no controller. Used where a scene applies on some routes only. */
  disabled?: boolean
  children: ReactNode
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const COMPACT = '(max-width: 1023px)'

/**
 * A reversible, scroll-linked scene. It owns ONE custom property, --hb-p (0 → 1), written by the shared
 * scroll controller; every visual state is CSS (site-tokens.css "Scenes"). Unlike SiteReveal this is never
 * latched: scrolling down assembles, scrolling back up separates along the same path.
 *
 * Without JS, under reduced motion, or if the controller never starts, the CSS default is p = 1, the
 * complete state, so no content ever depends on this component running.
 */
export function SiteScene({ as: Tag = 'div', id, className, style, anchor = 'center', from = 0.85, to = 0.35, settleAtEnd = false, compact, disabled = false, children }: SiteSceneProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [isCompact, setIsCompact] = useState(false)
  const hasCompact = compact !== undefined

  useIsomorphicLayoutEffect(() => {
    if (!hasCompact || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(COMPACT)
    const sync = () => setIsCompact(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [hasCompact])

  const range = isCompact && compact ? { anchor: compact.anchor ?? anchor, from: compact.from ?? from, to: compact.to ?? to } : { anchor, from, to }

  useIsomorphicLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    if (disabled) { node.style.removeProperty('--hb-p'); return }
    return registerScene(node, { anchor: range.anchor, from: range.from, to: range.to, settleAtEnd })
  }, [range.anchor, range.from, range.to, settleAtEnd, disabled])

  return (
    <Tag ref={ref} id={id} data-scene={disabled ? undefined : ''} className={className} style={style}>
      {children}
    </Tag>
  )
}
