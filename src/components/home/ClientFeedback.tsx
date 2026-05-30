'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

const stats = [
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

export default function TrustStack() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 sm:px-6 sm:py-20 md:px-10 lg:px-12 lg:py-24">
      {/* Background effects */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#39D97A]/5 blur-[140px]" />
        <div className="absolute -right-32 bottom-0 h-[300px] w-[400px] rounded-full bg-[#C6F135]/3 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.012)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:items-start">
          {/* Left: Heading + CTA */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-28"
          >
            {/* Label */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/8 px-4 py-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                Trust Stack
              </span>
            </div>

            {/* Heading */}
            <h2 className="max-w-md text-4xl font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">
              Built to create confidence before clients even{' '}
              <span className="relative inline-block text-[#39D97A]">
                contact you.
                <svg
                  className="absolute -bottom-1 left-0 h-3 w-full text-[#39D97A]/60"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8C42 2 130 2 197 6"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Description */}
            <p className="mt-6 max-w-md text-sm leading-7 text-white/55 sm:text-base">
              Your website should not only look good. It should answer silent buyer doubts, 
              show credibility, explain value clearly, and make the next step feel easy.
            </p>

            {/* CTA */}
            <Link
              href="/about"
              className="group mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-6 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
            >
              Learn More About Us
              <SvgIcon name="arrow-diagonal" size={14} color="#39D97A" />
            </Link>
          </motion.div>

          {/* Right: Stat cards grid */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                className="group relative overflow-hidden rounded-[1.8rem] border border-[#1E314A] bg-[#0E1B2D] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#39D97A]/25 hover:shadow-[0_20px_60px_rgba(57,217,122,0.08)]"
              >
                {/* Top glow line on hover */}
                <div className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[#39D97A]/50 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

                {/* Icon */}
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/8 transition-transform duration-300 group-hover:scale-105">
                  <SvgIcon name={stat.icon} size={24} color="#39D97A" />
                </div>

                {/* Value */}
                <p className="text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                  {stat.value}
                </p>

                {/* Label */}
                <p className="mt-2 text-sm font-bold text-white/70">{stat.label}</p>

                {/* Description */}
                <p className="mt-2 text-xs leading-5 text-white/40">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}