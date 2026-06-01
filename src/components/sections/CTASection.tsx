'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface CTASectionProps {
  data: {
    title?: string
    subtitle?: string
    buttonText?: string
    buttonLink?: string
  }
}

export default function CTASection({ data }: CTASectionProps) {
  const reducedMotion = useReducedMotion()

  const {
    title = 'Ready To Grow Your Brand?',
    subtitle = 'Let\'s build a website that drives results.',
    buttonText = 'Start Your Project',
    buttonLink = '/contact',
  } = data || {}

  return (
    <section className="relative overflow-hidden bg-gradient-navy-orange px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-20">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-[320px] w-[420px] rounded-full bg-[var(--accent-orange)]/20 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-[300px] w-[380px] rounded-full bg-[var(--accent)]/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center, rgba(255,107,53,0.1), transparent 70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-orange)] animate-pulse" />
            Get Started Today
          </div>

          <h2 className="mx-auto max-w-4xl text-3xl font-black leading-[1.2] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
            {title}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
            {subtitle}
          </p>

          <div className="mt-8">
            <Link
              href={buttonLink}
              className="group inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-gradient-warm px-8 py-3 text-sm font-black text-white shadow-[0_0_30px_rgba(255,107,53,0.3)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(255,107,53,0.5)]"
            >
              {buttonText}
              <SvgIcon name="arrow-diagonal" size={16} color="white" className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/70">
            <div className="flex items-center gap-1.5">
              <SvgIcon name="verified" size={12} color="var(--accent)" />
              <span>No-risk consultation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SvgIcon name="verified" size={12} color="var(--accent)" />
              <span>Transparent pricing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SvgIcon name="verified" size={12} color="var(--accent)" />
              <span>Ongoing support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}