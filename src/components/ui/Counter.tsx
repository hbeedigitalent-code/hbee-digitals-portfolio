'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

interface CounterProps {
  value: number
  duration?: number
  suffix?: string
  prefix?: string
  start?: number
  onComplete?: (final: string) => void
}

export default function Counter({
  value,
  duration = 2000,
  suffix = '',
  prefix = '',
  start = 0,
  onComplete,
}: CounterProps) {
  const [count, setCount] = useState(start)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const hasAnimated = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      setCount(value)
      hasAnimated.current = true
      onComplete?.(`${prefix}${value.toLocaleString()}${suffix}`)
      return
    }

    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true
      let startTime: number | null = null
      const endValue = value

      const animate = (currentTime: number) => {
        if (startTime === null) startTime = currentTime
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentValue = Math.floor(easeOutQuart * (endValue - start) + start)
        setCount(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          onComplete?.(`${prefix}${value.toLocaleString()}${suffix}`)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [isInView, value, duration, start, prefix, suffix, prefersReducedMotion, onComplete])

  return (
    <span ref={ref} aria-live="off">
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}