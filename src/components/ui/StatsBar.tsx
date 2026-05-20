'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import Counter from './Counter'
import SvgIcon from '@/components/ui/SvgIcon'

interface Stat {
  value: number
  label: string
  prefix?: string
  suffix?: string
  icon?: string
}

interface StatsBarProps {
  stats?: Stat[]
  title?: string
  subtitle?: string
}

const defaultStats: Stat[] = [
  { value: 87, label: 'Projects Completed', suffix: '+', icon: 'portfolio' },
  { value: 45, label: 'Happy Clients', suffix: '+', icon: 'growth' },
  { value: 5, label: 'Years Experience', suffix: '+', icon: 'strategy' },
  { value: 98, label: 'Success Rate', suffix: '%', icon: 'analytics' },
]

export default function StatsBar({
  stats = defaultStats,
  title = 'Impact that speaks through numbers',
  subtitle = 'A snapshot of the growth systems, client results, and digital experiences we continue to build.',
}: StatsBarProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const reducedMotion = useReducedMotion()

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#07111F] py-14 text-white sm:py-16 lg:py-20"
      aria-label="Agency statistics"
    >
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-0 h-[320px] w-[420px] rounded-full bg-[#39D97A]/7 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[380px] rounded-full bg-[#C6F135]/5 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-9 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <span className="h-2 w-2 rounded-full bg-[#39D97A]" />
              Growth Snapshot
            </p>

            <h2 className="max-w-3xl text-3xl font-black leading-[0.98] tracking-[-0.055em] sm:text-4xl md:text-5xl">
              {title}
            </h2>
          </motion.div>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            viewport={{ once: true }}
            className="max-w-2xl text-sm leading-7 text-white/60 sm:text-base lg:justify-self-end"
          >
            {subtitle}
          </motion.p>
        </div>

        <dl className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={`${stat.label}-${index}`}
              initial={reducedMotion ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[1.5rem] border border-[#1E314A] bg-[#0E1B2D]/92 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.2)] transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/28 hover:bg-[#13233A] sm:p-5 lg:p-6"
            >
              <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[#39D97A]/70 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10 sm:h-12 sm:w-12">
                <SvgIcon name={stat.icon || 'analytics'} size={20} color="#39D97A" />
              </div>

              <dt className="sr-only">{stat.label}</dt>

              <dd className="text-3xl font-black tracking-[-0.06em] text-white sm:text-4xl lg:text-5xl">
                <span className="bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
                  <Counter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    duration={1800}
                    start={reducedMotion || !inView ? stat.value : 0}
                  />
                </span>
              </dd>

              <dd className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45 sm:text-sm">
                {stat.label}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  )
}