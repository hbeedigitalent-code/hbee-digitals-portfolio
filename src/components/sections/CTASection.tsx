'use client'

import { CTAData } from '@/types'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface CTASectionProps {
  data: CTAData
}

function CurvedUnderlineText({
  children,
}: {
  children: React.ReactNode
}) {
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

export default function CTASection({
  data,
}: CTASectionProps) {
  const reducedMotion = useReducedMotion()

  const {
    title = 'Ready to build something that drives growth?',
    subtitle = 'Let’s improve your website, store experience, and digital growth system with a cleaner, more strategic foundation.',
    buttonText = 'Get Free Audit',
    buttonLink = '/contact',
  } = data || {}

  return (
    <section className="relative overflow-hidden py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[460px] w-[760px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[120px]" />

        <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-[#C6F135]/8 blur-[110px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.022)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={
            reducedMotion
              ? false
              : { opacity: 0, y: 24 }
          }
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] via-[#0B1625] to-[#07111F] shadow-[0_40px_120px_rgba(0,0,0,0.34)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.15),transparent_38%),linear-gradient(135deg,rgba(57,217,122,0.06),rgba(198,241,53,0.03)_42%,rgba(6,14,28,0)_80%)]" />

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

          <div className="relative grid gap-12 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12 lg:py-14">
            <div className="max-w-4xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon
                  name="rocket"
                  size={14}
                  color="#39D97A"
                />
                Start Your Growth System
              </div>

              <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl">
                {title.includes('growth') ? (
                  <>
                    {title.replace(/growth.*/i, '')}

                    <CurvedUnderlineText>
                      {title.match(/growth.*/i)?.[0] ||
                        'growth?'}
                    </CurvedUnderlineText>
                  </>
                ) : (
                  <>
                    Ready to build something that drives{' '}
                    <CurvedUnderlineText>
                      growth?
                    </CurvedUnderlineText>
                  </>
                )}
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/60 sm:text-base md:text-lg md:leading-8">
                {subtitle}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {[
                  'Shopify Optimization',
                  'Conversion Systems',
                  'Premium Brand Experience',
                ].map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-[#39D97A]/14 bg-[#39D97A]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#39D97A]"
                  >
                    <SvgIcon
                      name="verified"
                      size={12}
                      color="#39D97A"
                    />

                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <Link
                href={buttonLink}
                className="group inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-[#39D97A] px-7 py-4 text-sm font-black text-[#06101F] shadow-[0_0_35px_rgba(57,217,122,0.18)] transition duration-300 hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                {buttonText}

                <SvgIcon
                  name="arrow-diagonal"
                  size={18}
                  color="#06101F"
                  className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/45">
                <div className="inline-flex items-center gap-2">
                  <SvgIcon
                    name="messages"
                    size={14}
                    color="#39D97A"
                  />

                  Fast Response
                </div>

                <div className="inline-flex items-center gap-2">
                  <SvgIcon
                    name="security"
                    size={14}
                    color="#39D97A"
                  />

                  Premium Support
                </div>
              </div>
            </div>
          </div>

          <div className="relative border-t border-[#1E314A] bg-[#07111F]/55 px-6 py-5 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#39D97A]/14 bg-[#39D97A]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  <SvgIcon
                    name="star"
                    size={12}
                    color="#C6F135"
                  />
                  Trusted by growing brands
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/45">
                  <SvgIcon
                    name="rocket"
                    size={12}
                    color="#39D97A"
                  />
                  Results Focused
                </div>
              </div>

              <div className="text-sm text-white/45">
                Helping businesses improve trust, visibility, and conversions online.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}