'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface HeroSectionProps {
  data: {
    title?: string
    subtitle?: string
    welcomeText?: string
    primaryCtaText?: string
    primaryCtaLink?: string
    secondaryCtaText?: string
    secondaryCtaLink?: string
    backgroundImage?: string
    featureBullets?: string | string[]
    video_url?: string
  }
}

const words = ['Shopify Stores', 'Online Stores', 'Modern Brands', 'Digital Growth']

function cleanTitle(title?: string) {
  return (title || 'Engineering Growth For')
    .replace(/Shopify Stores\.?/gi, '')
    .replace(/Online Stores\.?/gi, '')
    .replace(/Modern Brands\.?/gi, '')
    .replace(/Digital Growth\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function TypewriterWord({
  active,
  reducedMotion,
}: {
  active: boolean
  reducedMotion: boolean
}) {
  const [wordIndex, setWordIndex] = useState(0)
  const [text, setText] = useState(words[0])

  useEffect(() => {
    if (reducedMotion || !active) {
      setText(words[wordIndex])
      return
    }

    const current = words[wordIndex]
    let index = 0
    setText('')

    const typing = window.setInterval(() => {
      index += 1
      setText(current.slice(0, index))

      if (index >= current.length) {
        window.clearInterval(typing)
        window.setTimeout(() => {
          setWordIndex((prev) => (prev + 1) % words.length)
        }, 1700)
      }
    }, 62)

    return () => window.clearInterval(typing)
  }, [wordIndex, active, reducedMotion])

  return (
    <span className="relative inline-block">
      <span className="inline-block whitespace-nowrap bg-gradient-to-r from-[var(--accent)] via-[var(--accent-lime)] to-[var(--accent-orange)] bg-clip-text text-transparent">
        {text}
        {!reducedMotion && active && (
          <span className="ml-1 inline-block h-[0.8em] w-[2px] animate-pulse rounded-full bg-[var(--accent-orange)]" />
        )}
      </span>

      <svg
        className="absolute -bottom-1 left-0 h-3 w-full text-[var(--accent)]/70 sm:-bottom-2 sm:h-4"
        viewBox="0 0 260 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M5 13C62 2 168 2 255 11"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function HeroSection({ data }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const isInView = useInView(sectionRef, { amount: 0.35 })
  const reducedMotion = Boolean(useReducedMotion())

  const {
    title,
    subtitle = 'We build scalable digital systems, conversion-focused experiences, and growth infrastructure for ambitious e-commerce and modern businesses.',
    primaryCtaText = 'Get Free Audit',
    primaryCtaLink = '/contact',
    secondaryCtaText = 'View Case Studies',
    secondaryCtaLink = '/portfolio',
    backgroundImage,
    video_url,
    featureBullets,
  } = data || {}

  const baseTitle = cleanTitle(title)

  const bullets = useMemo(() => {
    if (Array.isArray(featureBullets)) return featureBullets.filter(Boolean)
    if (typeof featureBullets === 'string' && featureBullets.trim()) {
      return featureBullets.split('|').map((item) => item.trim()).filter(Boolean)
    }
    return ['Shopify Optimization', 'Conversion Systems', 'Accessibility Support']
  }, [featureBullets])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-premium px-5 pt-20 pb-12 text-white sm:px-6 md:px-10 lg:pt-24 lg:pb-16"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[280px] w-[280px] rounded-full bg-[var(--accent-orange)]/10 blur-[90px] sm:h-[350px] sm:w-[350px] sm:blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[var(--accent)]/15 blur-[90px] sm:h-[300px] sm:w-[300px] sm:blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center, rgba(255,107,53,0.08), transparent 60%)]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_0.9fr] lg:gap-10 lg:items-start">
          {/* Left Column - Content */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            {/* Top badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)] sm:px-4 sm:py-2 sm:text-[11px] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-orange)] sm:h-2 sm:w-2" />
              Digital Growth Systems
            </div>

            <h1 className="max-w-[700px] text-3xl font-black leading-[1.2] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl lg:text-6xl">
              {baseTitle}{' '}
              <TypewriterWord active={isInView} reducedMotion={reducedMotion} />
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7 md:text-lg">
              {subtitle}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={primaryCtaLink}
                className="group inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-gradient-orange-green px-6 py-2.5 text-sm font-black text-white shadow-[0_0_30px_rgba(255,107,53,0.3)] transition duration-300 hover:scale-[1.02] sm:px-7 sm:py-3"
              >
                {primaryCtaText}
                <SvgIcon name="arrow-diagonal" size={14} color="white" />
              </Link>

              <Link
                href={secondaryCtaLink}
                className="group inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-black text-white backdrop-blur-sm transition duration-300 hover:bg-white/20 hover:scale-[1.02] sm:px-7 sm:py-3"
              >
                {secondaryCtaText}
                <SvgIcon name="arrow-diagonal" size={14} color="white" />
              </Link>
            </div>

            {/* Feature bullets */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {bullets.slice(0, 3).map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white backdrop-blur-sm sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[10px]"
                >
                  <SvgIcon name="verified" size={9} color="var(--accent)" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Image that fits within content */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center h-full"
          >
            <div className="relative mx-auto w-full max-w-[360px] sm:max-w-[400px] lg:max-w-[440px]">
              {/* Soft glow behind image */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[var(--accent)]/15 via-[var(--accent-lime)]/10 to-[var(--accent-orange)]/15 blur-2xl" />
              
              {/* Square image container - fits perfectly */}
              <div className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm">
                <div className="relative aspect-square overflow-hidden rounded-xl">
                  {video_url ? (
                    <video
                      src={video_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      poster={backgroundImage}
                      className="h-full w-full object-cover"
                    />
                  ) : backgroundImage ? (
                    <img
                      src={backgroundImage}
                      alt="Digital growth system"
                      loading="eager"
                      fetchPriority="high"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <HeroDashboardMockup />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function HeroDashboardMockup() {
  const bars = [34, 46, 40, 52, 61, 55, 72, 63, 78, 67, 86, 79]

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#0A1D37] to-[#0F3460] p-3 sm:p-5">
      <div className="rounded-lg bg-white/5 p-2 backdrop-blur-sm sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--accent)] sm:text-[9px]">
              Growth Intelligence
            </p>
            <h3 className="mt-1 text-[10px] font-black text-white sm:text-xs">
              Store Health Overview
            </h3>
          </div>
          <span className="rounded-full bg-[var(--accent)]/20 px-1.5 py-0.5 text-[7px] font-black text-[var(--accent)] backdrop-blur-sm sm:px-2 sm:py-1 sm:text-[8px]">
            Live
          </span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">
        {[
          ['growth', '+38%', 'Conversion Lift'],
          ['analytics', '94%', 'Store Health'],
          ['security', 'AA', 'Accessibility'],
          ['performance', '91', 'Speed Score'],
        ].map(([icon, value, label]) => (
          <div
            key={label}
            className="rounded-lg bg-white/5 p-2 backdrop-blur-sm sm:p-3"
          >
            <SvgIcon name={icon} size={12} color="var(--accent)" />
            <p className="mt-2 text-xs font-black text-white sm:mt-3 sm:text-sm">
              {value}
            </p>
            <p className="mt-0.5 text-[7px] font-semibold text-white/60 sm:text-[8px]">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-lg bg-white/5 p-2 backdrop-blur-sm sm:mt-3 sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[7px] font-black text-white sm:text-[8px]">
            Optimization Progress
          </p>
          <p className="text-[6px] text-white/60 sm:text-[7px]">Last 30 days</p>
        </div>

        <div className="flex h-10 items-end gap-1 sm:h-14 sm:gap-1.5">
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-full bg-gradient-to-t from-[var(--accent)]/50 to-[var(--accent-lime)]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}