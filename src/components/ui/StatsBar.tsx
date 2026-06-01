'use client'

import { motion, useReducedMotion } from 'framer-motion'
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
    value: '87+',
    label: 'Projects Delivered',
    description: 'Successful digital systems delivered.',
    icon: 'portfolio',
  },
  {
    value: '35+',
    label: 'Stores Improved',
    description: 'Stores optimized for better performance.',
    icon: 'ecommerce',
  },
  {
    value: '98%',
    label: 'Client Satisfaction',
    description: 'Focused on measurable client success.',
    icon: 'star',
  },
  {
    value: '24hr',
    label: 'Average Response',
    description: 'We respond fast and keep projects moving.',
    icon: 'messages',
  },
]

export default function StatsBar({ stats = defaultStats }: StatsBarProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          viewport={{ once: true }}
          className="group relative overflow-hidden rounded-[1.8rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/25 hover:shadow-[0_20px_60px_rgba(57,217,122,0.08)]"
        >
          {/* Top glow line on hover */}
          <div className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

          {/* Icon */}
          {stat.icon && (
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/8 transition-transform duration-300 group-hover:scale-105">
              <SvgIcon name={stat.icon} size={24} color="var(--accent)" />
            </div>
          )}

          {/* Value */}
          <p className="text-4xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
            {stat.value}
          </p>

          {/* Label */}
          <p className="mt-2 text-sm font-bold text-[var(--text-secondary)]">{stat.label}</p>

          {/* Description */}
          {stat.description && (
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{stat.description}</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}