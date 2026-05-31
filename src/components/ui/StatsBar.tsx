'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface Stat {
  value: string | number
  label: string
  icon?: string
}

interface StatsBarProps {
  stats?: Stat[]
}

const fallbackStats: Stat[] = [
  { value: '87+', label: 'Projects Completed', icon: 'portfolio' },
  { value: '45+', label: 'Happy Clients', icon: 'growth' },
  { value: '5+', label: 'Years Experience', icon: 'strategy' },
  { value: '98%', label: 'Success Rate', icon: 'analytics' },
]

function extractNumber(value: string | number) {
  if (typeof value === 'number') return value
  const match = value.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

function extractSuffix(value: string | number) {
  if (typeof value === 'number') return ''
  return value.replace(/[0-9]/g, '')
}

function Counter({ value }: { value: string | number }) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)

  const finalNumber = extractNumber(value)
  const suffix = extractSuffix(value)

  useEffect(() => {
    const element = ref.current
    if (!element || started) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return

        setStarted(true)

        let current = 0
        const duration = 1500
        const stepTime = 16
        const increment = finalNumber / (duration / stepTime)

        const timer = window.setInterval(() => {
          current += increment

          if (current >= finalNumber) {
            setCount(finalNumber)
            window.clearInterval(timer)
          } else {
            setCount(Math.floor(current))
          }
        }, stepTime)

        observer.disconnect()
      },
      { threshold: 0.35 }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [finalNumber, started])

  return (
    <span ref={ref}>
      {started ? count : 0}
      {suffix}
    </span>
  )
}

export default function StatsBar({ stats = fallbackStats }: StatsBarProps) {
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden rounded-[1.9rem] border border-[var(--border)] bg-[var(--bg-page)] p-4 text-[var(--text-primary)] shadow-[0_18px_55px_rgba(10,29,55,0.08)] sm:p-5 lg:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_40%)]" />

      <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={`${stat.label}-${index}`}
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-card)] p-4 transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/30 hover:bg-[var(--bg-card-hover)] sm:p-5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(57,217,122,0.08),transparent_55%)] opacity-0 transition duration-300 group-hover:opacity-100" />

            <div className="relative">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                <SvgIcon name={stat.icon || 'growth'} size={20} color="#39D97A" />
              </div>

              <h3 className="text-3xl font-black leading-none tracking-[-0.05em] sm:text-4xl">
                <span className="bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
                  <Counter value={stat.value} />
                </span>
              </h3>

              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)] sm:text-xs">
                {stat.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
