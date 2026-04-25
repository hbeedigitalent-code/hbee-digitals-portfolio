'use client'

import { useEffect, useRef } from 'react'

export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      const scrollY = window.scrollY
      const elementTop = ref.current.getBoundingClientRect().top + scrollY
      const offset = (scrollY - elementTop) * speed
      ref.current.style.transform = `translateY(${offset}px)`
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return ref
}
