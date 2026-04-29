'use client'

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
  { value: 98, label: 'Success Rate', suffix: '%' }
]

export default function StatsBar({ 
  stats = defaultStats, 
  title = "Our Impact by the Numbers",
  bgColor = "#0A1D37" 
}: StatsBarProps) {
  return (
    <section className="py-16" style={{ backgroundColor: bgColor }}>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2">
                <Counter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              </div>
              <div className="text-sm md:text-base text-white/70">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}