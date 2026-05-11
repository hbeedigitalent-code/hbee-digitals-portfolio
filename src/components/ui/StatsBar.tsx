'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef, useState, useCallback } from 'react'
import Counter from './Counter'

interface Stat {
  value: number
  label: string
  prefix?: string
  suffix?: string
}

interface StatsBarProps {
  stats?: Stat[]
  title?: string
  bgColor?: string
}

const defaultStats: Stat[] = [
  { value: 87, label: 'Projects Completed', suffix: '+' },
  { value: 45, label: 'Happy Clients', suffix: '+' },
  { value: 5, label: 'Years Experience', suffix: '+' },
  { value: 98, label: 'Success Rate', suffix: '%' },
]

export default function StatsBar({
  stats = defaultStats,
  title = 'Our Impact by the Numbers',
  bgColor = '#0A1D37',
}: StatsBarProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-60px' })
  const reducedMotion = useReducedMotion()
  const [completed, setCompleted] = useState<Set<number>>(new Set())

  const handleComplete = useCallback((index: number) => {
    setCompleted((prev) => new Set(prev).add(index))
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 relative overflow-hidden"
      style={{
        backgroundColor: bgColor,
        boxShadow: 'inset 0 1px 0 rgba(0,123,255,0.15), inset 0 -1px 0 rgba(0,123,255,0.15)',
      }}
      aria-label="Agency statistics"
    >
      {/* Footer‑style spacing */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12">
        {title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
          </motion.div>
        )}

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-2"
                aria-label={`${stat.prefix || ''}${stat.value}${stat.suffix || ''} ${stat.label}`}
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #007BFF, #00BFFF)' }}
                >
                  <Counter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    duration={2000}
                    onComplete={() => handleComplete(index)}
                    start={reducedMotion ? stat.value : 0}
                  />
                </span>
              </dd>
              <dd className="text-sm md:text-base text-white/70">{stat.label}</dd>

              <motion.div
                className="h-px mt-3 rounded-full mx-auto"
                style={{ background: 'linear-gradient(90deg, #007BFF, #00BFFF)', width: '60%' }}
                initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                animate={completed.has(index) || reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                aria-hidden="true"
              />
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}