'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-navy)] py-20 md:py-28">
      {/* Animated gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-orange)] to-transparent" />
      
      <div className="container-custom relative">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card-dark)] px-4 py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[var(--accent-lime)] animate-pulse" />
            <span className="text-sm font-semibold text-[var(--text-on-dark-muted)]">
              Q3 Growth Readiness Initiative
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1]"
          >
            Is Your Business Ready For{' '}
            <span className="bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] bg-clip-text text-transparent">
              Its Next Stage
            </span>{' '}
            Of Growth?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-[var(--text-on-dark-muted)] max-w-3xl mx-auto"
          >
            The Hbee Growth Readiness Assessment™ helps ecommerce brands evaluate 
            visibility, conversion, retention, authority, and scalability before 
            the next stage of growth.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/assessment"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] px-8 py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.02] shadow-lg shadow-[var(--accent-orange)]/20"
            >
              Start Assessment
              <SvgIcon name="arrow-right" size={20} color="white" />
            </Link>
            
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-transparent px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              Learn More
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 text-sm text-[var(--text-muted)]"
          >
            ⏱️ Estimated completion time: 5–7 minutes
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-muted)]"
          >
            <span className="flex items-center gap-2">
              <SvgIcon name="check" size={16} color="var(--accent-lime)" />
              Free Assessment
            </span>
            <span className="flex items-center gap-2">
              <SvgIcon name="check" size={16} color="var(--accent-lime)" />
              Instant Score
            </span>
            <span className="flex items-center gap-2">
              <SvgIcon name="check" size={16} color="var(--accent-lime)" />
              Growth Profile
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}