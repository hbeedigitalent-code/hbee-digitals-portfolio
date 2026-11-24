'use client'

import { useEffect, useRef } from 'react'

/**
 * Keyboard focus inside the logo marquee never restarts it. CSS pauses the track in place on :focus-within (and the
 * hidden pause control stays reachable). The only thing left for script is the rare case where the focused link has
 * travelled out of view: then, and only then, the paused animation is moved so the link is visible. No snap-back to the
 * start, no layout change, and a no-op when the link is already on screen. Renders nothing.
 */
export function MarqueeFocusGuard() {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>('[data-marquee]')
    const viewport = root?.querySelector<HTMLElement>('[data-marquee-viewport]')
    const track = root?.querySelector<HTMLElement>('[data-marquee-track]')
    const group = track?.firstElementChild as HTMLElement | null
    if (!root || !viewport || !track || !group) return

    const onFocusIn = (event: FocusEvent) => {
      const link = event.target instanceof HTMLAnchorElement ? event.target : null
      if (!link || typeof track.getAnimations !== 'function') return
      const animation = track.getAnimations()[0]
      const duration = Number(animation?.effect?.getComputedTiming().duration)
      if (!animation || !Number.isFinite(duration) || duration <= 0) return
      const view = viewport.getBoundingClientRect()
      const box = link.getBoundingClientRect()
      if (box.left >= view.left && box.right <= view.right) return
      const distance = group.getBoundingClientRect().width
      const position = box.left - track.getBoundingClientRect().left
      const offset = Math.min(Math.max(position - (view.width - box.width) / 2, 0), distance)
      animation.currentTime = (offset / distance) * duration
    }
    root.addEventListener('focusin', onFocusIn)
    return () => root.removeEventListener('focusin', onFocusIn)
  }, [])

  return <span ref={marker} hidden />
}
