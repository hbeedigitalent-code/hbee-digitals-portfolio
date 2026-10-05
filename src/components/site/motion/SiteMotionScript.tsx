'use client'

import { useEffect } from 'react'

/**
 * Pre-paint motion gate for the site surface.
 *
 * The inline script runs during the initial HTML parse (before first paint)
 * and marks the surface root data-motion-ready only when motion is allowed and
 * IntersectionObserver exists — so below-the-fold content can start hidden
 * without a visible flash.
 *
 * Safety net: if React never hydrates (script error, blocked bundle), the
 * root is un-readied after 3s so hidden content becomes visible.
 * MotionLive marks hydration so the safety net stands down.
 *
 * Inline scripts do not execute on client-side navigation, so entering the
 * surface that way simply shows content without entrance motion.
 */
const GATE = `(function(){try{var r=document.currentScript&&document.currentScript.closest('[data-surface-root]');if(!r)return;var m=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(m||!('IntersectionObserver' in window))return;r.setAttribute('data-motion-ready','');setTimeout(function(){if(!r.hasAttribute('data-motion-live'))r.removeAttribute('data-motion-ready');},3000);}catch(e){}})();`

export function SiteMotionGate() {
  return <script dangerouslySetInnerHTML={{ __html: GATE }} />
}

export function SiteMotionLive() {
  useEffect(() => {
    document.querySelector('[data-surface-root]')?.setAttribute('data-motion-live', '')
  }, [])
  return null
}
