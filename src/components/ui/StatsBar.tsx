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
  {
    value: '87+',
    label: 'Projects Completed',
    icon: 'portfolio',
  },
  {
    value: '45+',
    label: 'Happy Clients',
    icon: 'growth',
  },
  {
    value: '5+',
    label: 'Years Experience',
    icon: 'strategy',
  },
  {
    value: '98%',
    label: 'Success Rate',
    icon: 'analytics',
  },
]

function cleanIcon(icon?: string) {
  if (!icon) return 'growth'

  return icon
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()
}

function extractNumber(value: string | number) {
  if (typeof value === 'number') return value

  const match = value.match(/\d+/)

  return match ? parseInt(match[0]) : 0
}

function extractSuffix(value: string | number) {
  if (typeof value === 'number') return ''

  return value.replace(/[0-9]/g, '')
}

function Counter({
  value,
}: {
  value: string | number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)
  const suffix = extractSuffix(value)
  const finalNumber = extractNumber(value)

  useEffect(() => {
    const element = ref.current

    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0
          const duration = 1600
          const increment = finalNumber / (duration / 16)

          const timer = setInterval(() => {
            start += increment

            if (start >= finalNumber) {
              setCount(finalNumber)
              clearInterval(timer)
            } else {
              setCount(Math.floor(start))
            }
          }, 16)

          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [finalNumber])

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  )
}

export default function StatsBar({
  stats = fallbackStats,
}: StatsBarProps) {
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden rounded-[1.9rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#07111F] p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.22)] sm:p-5 lg:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_40%)]" />

      <div className="relative grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={`${stat.label}-${index}`}
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: index * 0.06,
            }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-[1.4rem] border border-[#1E314A] bg-[#0B1728]/90 p-4 transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/25 hover:bg-[#13233A] sm:p-5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(57,217,122,0.08),transparent_55%)] opacity-0 transition duration-300 group-hover:opacity-100" />

            <div className="relative">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                <SvgIcon
                  name={cleanIcon(stat.icon)}
                  size={20}
                  color="#39D97A"
                />
              </div>

              <h3 className="text-3xl font-black leading-none tracking-[-0.05em] text-white sm:text-4xl">
                <span className="bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
                  <Counter value={stat.value} />
                </span>
              </h3>

              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/48 sm:text-xs">
                {stat.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}