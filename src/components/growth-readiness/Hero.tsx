// src/components/growth-readiness/Hero.tsx
'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-navy)] py-20 md:py-28">
      {/* Animated gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-orange)] to-transparent" />
      
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent-orange)]/5 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
      </div>

      <div className="container-custom relative">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-dark)] bg-[var(--bg-card-dark)]/80 px-4 py-2 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-lime)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-lime)]" />
            </span>
            <span className="text-sm font-semibold text-[var(--text-on-dark-muted)]">
              Q3 Growth Readiness Initiative
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
          >
            Is Your Business Ready For{' '}
            <span className="bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] bg-clip-text text-transparent">
              Its Next Stage
            </span>{' '}
            Of Growth?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-[var(--text-on-dark-muted)] max-w-3xl mx-auto leading-relaxed"
          >
            The Hbee Growth Readiness Assessment™ helps ecommerce brands evaluate 
            visibility, conversion, retention, authority, and scalability before 
            the next stage of growth.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/assessment"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] px-8 py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-[var(--accent-orange)]/25"
            >
              Start Assessment
              <SvgIcon name="arrow-right" size={20} color="white" className="transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link
              href="#how-it-works"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/40"
            >
              Learn More
              <SvgIcon name="chevron-down" size={18} color="white" className="transition-transform group-hover:translate-y-1" />
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-sm text-[var(--text-muted)]"
          >
            ⏱️ Estimated completion time: <span className="text-white font-semibold">5–7 minutes</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-muted)]"
          >
            <span className="flex items-center gap-2">
              <div className="rounded-full bg-[var(--accent-lime)]/20 p-1">
                <SvgIcon name="check" size={14} color="var(--accent-lime)" />
              </div>
              Free Assessment
            </span>
            <span className="flex items-center gap-2">
              <div className="rounded-full bg-[var(--accent-lime)]/20 p-1">
                <SvgIcon name="check" size={14} color="var(--accent-lime)" />
              </div>
              Instant Score
            </span>
            <span className="flex items-center gap-2">
              <div className="rounded-full bg-[var(--accent-lime)]/20 p-1">
                <SvgIcon name="check" size={14} color="var(--accent-lime)" />
              </div>
              Growth Profile
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}