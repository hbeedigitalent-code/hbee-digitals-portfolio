'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface StatItem {
  value: string
  label: string
  icon?: string
  description?: string
}

interface StatsBarProps {
  stats?: StatItem[]
}

const defaultStats: StatItem[] = [
  {
    value: '87',
    label: 'Projects Completed',
    description: 'Successful digital systems delivered.',
    icon: 'portfolio',
  },
  {
    value: '45',
    label: 'Happy Clients',
    description: 'Trusted partners across ecommerce.',
    icon: 'star',
  },
  {
    value: '5',
    label: 'Years Experience',
    description: 'Years of expertise in digital growth.',
    icon: 'growth',
  },
  {
    value: '98',
    label: 'Client Satisfaction',
    description: 'Focused on measurable client success.',
    icon: 'analytics',
  },
]

// Counter animation component
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isInView || reducedMotion) {
      setCount(target)
      return
    }

    let start = 0
    const duration = 2000
    const step = Math.ceil(target / (duration / 16))
    
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [isInView, target, reducedMotion])

  return (
    <span ref={ref} className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">
      {count}{suffix}+
    </span>
  )
}

export default function StatsBar({ stats = defaultStats }: StatsBarProps) {
  const reducedMotion = useReducedMotion()

  // Parse numeric value from stat.value (e.g., "87+" -> 87)
  const getNumericValue = (value: string): number => {
    const num = parseInt(value.replace(/[^0-9]/g, ''))
    return isNaN(num) ? 0 : num
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const numericValue = getNumericValue(stat.value)
        const suffix = stat.value.includes('+') ? '+' : ''

        return (
          <motion.div
            key={stat.label}
            initial={reducedMotion ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-section)] p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] hover:border-[var(--accent)]/30"
          >
            {/* Animated gradient background on hover */}
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-r from-[var(--accent)]/5 to-[var(--accent-lime)]/5" />

            {/* Icon with animation */}
            <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-[var(--accent)]/30">
              <SvgIcon name={stat.icon || 'verified'} size={22} color="var(--accent)" />
            </div>

            {/* Counter Value */}
            <div className="relative">
              <Counter target={numericValue} suffix={suffix} />
            </div>

            {/* Label */}
            <p className="relative mt-2 text-sm font-bold text-[var(--text-primary)]">
              {stat.label}
            </p>

            {/* Description */}
            {stat.description && (
              <p className="relative mt-1 text-xs text-[var(--text-muted)]">
                {stat.description}
              </p>
            )}

            {/* Bottom accent line on hover */}
            <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)] transition-all duration-500 group-hover:w-full" />
          </motion.div>
        )
      })}
    </div>
  )
}