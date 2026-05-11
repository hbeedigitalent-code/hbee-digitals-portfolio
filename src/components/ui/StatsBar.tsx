'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
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
  { value: 50, label: 'Projects Completed', suffix: '+' },
  { value: 25, label: 'Happy Clients', suffix: '+' },
  { value: 5, label: 'Years Experience', suffix: '+' },
  { value: 98, label: 'Success Rate', suffix: '%' },
]

export default function StatsBar({
  stats = defaultStats,
  title = 'Our Impact by the Numbers',
  bgColor = '#0A1D37',
}: StatsBarProps) {
  const [finalLabels, setFinalLabels] = useState<Record<number, string>>({})

  const handleComplete = useCallback((index: number) => (finalValue: string) => {
    setFinalLabels((prev) => ({ ...prev, [index]: finalValue }))
  }, [])

  return (
    <section
      className="py-16"
      style={{ backgroundColor: bgColor }}
      aria-label="Agency statistics"
    >
      <div className="container mx-auto px-4">
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

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2"
                aria-label={
                  finalLabels[index] ||
                  `${stat.prefix || ''}${stat.value.toLocaleString()}${stat.suffix || ''} ${stat.label}`
                }
              >
                <Counter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  onComplete={handleComplete(index)}
                />
              </dd>
              <dd className="text-sm md:text-base text-white/70">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}