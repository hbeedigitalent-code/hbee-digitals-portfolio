'use client'

import { CTAData } from '@/types'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface CTASectionProps {
  data: CTAData
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75 sm:-bottom-3 sm:h-5"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function CTASection({ data }: CTASectionProps) {
  const reducedMotion = useReducedMotion()

  const {
    title = 'Ready to build something that drives growth?',
    subtitle = 'Let’s improve your website, store experience, and digital growth system with a cleaner, more strategic foundation.',
    buttonText = 'Get Free Audit',
    buttonLink = '/contact',
  } = data || {}

  return (
    <section className="relative overflow-hidden py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-[#C6F135]/8 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/88 p-6 text-center shadow-[0_35px_110px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8 md:p-10 lg:p-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.18),transparent_38%),linear-gradient(135deg,rgba(57,217,122,0.08),rgba(198,241,53,0.03)_42%,rgba(6,14,28,0)_80%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

          <div className="relative mx-auto max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#39D97A] sm:text-[11px]">
              <SvgIcon name="rocket" size={14} color="#39D97A" />
              Start Your Growth System
            </div>

            <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl">
              {title.includes('growth') ? (
                <>
                  {title.replace(/growth.*/i, '')}
                  <CurvedUnderlineText>
                    {title.match(/growth.*/i)?.[0] || 'growth?'}
                  </CurvedUnderlineText>
                </>
              ) : (
                <>
                  Ready to build a system that drives{' '}
                  <CurvedUnderlineText>growth?</CurvedUnderlineText>
                </>
              )}
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/62 sm:text-base md:text-lg md:leading-8">
              {subtitle}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={buttonLink}
                className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-7 py-3 text-sm font-black text-[#06101F] shadow-[0_0_36px_rgba(57,217,122,0.22)] transition hover:scale-[1.02]"
              >
                {buttonText}
                <SvgIcon
                  name="arrow-diagonal"
                  size={16}
                  color="#06101F"
                  className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>

              <Link
                href="/portfolio"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-7 py-3 text-sm font-bold text-white/82 backdrop-blur-xl transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 hover:text-white"
              >
                View Case Studies
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Strategy-first', icon: 'strategy' },
                { label: 'Premium execution', icon: 'precision' },
                { label: 'Growth support', icon: 'growth' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                >
                  <SvgIcon name={item.icon} size={20} color="#39D97A" className="mx-auto mb-3" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}