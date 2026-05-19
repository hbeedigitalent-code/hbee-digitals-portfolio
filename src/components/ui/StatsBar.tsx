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
      className="relative overflow-hidden bg-[#060E1C] py-16 text-white sm:py-20"
      aria-label="Agency statistics"
    >
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-0 h-[360px] w-[460px] rounded-full bg-[#39D97A]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-[#39D97A]/7 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 inline-flex rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              Growth Snapshot
            </p>

            <h2 className="max-w-3xl text-3xl font-black leading-[0.98] tracking-[-0.055em] sm:text-4xl md:text-5xl">
              {title}
            </h2>
          </motion.div>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            viewport={{ once: true }}
            className="max-w-2xl text-sm leading-7 text-white/60 sm:text-base lg:justify-self-end"
          >
            {subtitle}
          </motion.p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={`${stat.label}-${index}`}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.07 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_75px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/30 hover:bg-[#39D97A]/8"
            >
              <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[#39D97A]/70 to-transparent transition-transform duration-500 group-hover:scale-x-100" />
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#39D97A]/10 blur-2xl transition group-hover:bg-[#39D97A]/18" />

              <div className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10 transition group-hover:scale-105 group-hover:bg-[#39D97A]/14">
                  <SvgIcon name={stat.icon || 'growth'} size={22} color="#39D97A" />
                </div>

                <dt className="sr-only">{stat.label}</dt>

                <dd
                  className="text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl"
                  aria-label={`${stat.prefix || ''}${stat.value}${stat.suffix || ''} ${stat.label}`}
                >
                  <Counter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    duration={1900}
                    start={inView && !reducedMotion ? 0 : stat.value}
                  />
                </dd>

                <dd className="mt-2 text-sm font-semibold text-white/55">
                  {stat.label}
                </dd>

                <motion.div
                  className="mt-5 h-1 rounded-full bg-[#39D97A]"
                  initial={reducedMotion ? { width: '100%' } : { width: '0%' }}
                  animate={inView || reducedMotion ? { width: '68%' } : { width: '0%' }}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.08 }}
                  aria-hidden="true"
                />
              </div>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  )
}