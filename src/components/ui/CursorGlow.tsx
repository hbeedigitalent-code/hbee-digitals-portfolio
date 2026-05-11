'use client'

import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const orbRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseCurrent = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Don't render on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) return

    const orb = orbRef.current
    if (!orb) return

    // Fade the orb in
    orb.style.transition = 'opacity 0.3s ease'
    orb.style.opacity = '1'

    const handleMouseMove = (e: MouseEvent) => {
      mouseTarget.current.x = e.clientX
      mouseTarget.current.y = e.clientY
    }

    const animate = () => {
      // Lerp (smooth follow)
      const lerp = 0.08
      mouseCurrent.current.x += (mouseTarget.current.x - mouseCurrent.current.x) * lerp
      mouseCurrent.current.y += (mouseTarget.current.y - mouseCurrent.current.y) * lerp

      if (orb) {
        orb.style.transform = `translate(${mouseCurrent.current.x - 200}px, ${mouseCurrent.current.y - 200}px)`
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Don't render on mobile
  if (typeof window !== 'undefined' && window.innerWidth < 768) return null

  return (
    <div aria-hidden="true">
      <div
        ref={orbRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(0,123,255,0.12) 0%, rgba(0,191,255,0.06) 40%, transparent 70%)',
          opacity: 0, // will fade in on first mouse move
        }}
      />
    </div>
  )
}