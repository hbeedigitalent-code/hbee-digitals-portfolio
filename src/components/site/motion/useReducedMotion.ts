'use client'

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Live prefers-reduced-motion flag for JS-driven motion (later: the 3D hero,
 * scroll-linked scenes). CSS motion in site-tokens.css already honours the
 * media query on its own, so CSS-only components do not need this hook.
 *
 * Returns `true` until mounted, so nothing animates during SSR/hydration.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true)

  useEffect(() => {
    const media = window.matchMedia(QUERY)
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}
