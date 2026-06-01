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
    <span className="relative block min-h-[1.15em] min-w-[300px] overflow-hidden sm:min-w-[420px] lg:min-w-[520px]">
      <span className="inline-flex max-w-full items-center whitespace-nowrap bg-gradient-to-r from-[var(--accent)] via-[var(--accent-lime)] to-[var(--accent-orange)] bg-clip-text text-transparent">
        {text}
        {!reducedMotion && active && (
          <span className="ml-1 inline-block h-[0.75em] w-[3px] translate-y-[5px] animate-pulse rounded-full bg-[var(--accent-orange)]" />
        )}
      </span>

      <svg
        className="absolute -bottom-1 left-0 h-4 max-w-full text-[var(--accent-orange)]/75 transition-all duration-300 sm:-bottom-2 sm:h-5"
        style={{
          width: `${Math.min(Math.max(text.length * 28, 155), 500)}px`,
        }}
        viewBox="0 0 260 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M5 13C62 2 168 2 255 11"
          stroke="currentColor"
          strokeWidth="5"
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
      return featureBullets
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    return ['Shopify Optimization', 'Conversion Systems', 'Accessibility Support']
  }, [featureBullets])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-gradient-premium px-5 pt-28 text-white sm:px-6 md:px-10 lg:px-12"
      style={{ minHeight: 'calc(100vh - 80px)' }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[280px] w-[280px] rounded-full bg-[var(--accent-orange)]/10 blur-[90px] sm:h-[430px] sm:w-[430px] sm:blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[var(--accent)]/15 blur-[90px] sm:h-[390px] sm:w-[390px] sm:blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center, rgba(255,107,53,0.1), transparent 70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-7xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 min-w-0"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)] sm:text-[11px] backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-[var(--accent-orange)]" />
              Digital Growth Systems
            </div>

            <h1 className="max-w-[760px] text-[clamp(2.5rem,12vw,4rem)] font-black leading-[1.1] tracking-[-0.06em] text-white sm:text-[clamp(3rem,7vw,4.5rem)]">
              {baseTitle}
              <br />
              <TypewriterWord active={isInView} reducedMotion={reducedMotion} />
            </h1>

            <p className="mt-6 max-w-2xl text-[15px] leading-7 text-white/80 sm:text-base md:text-lg md:leading-8">
              {subtitle}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={primaryCtaLink}
                className="group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full bg-gradient-orange-green px-7 py-3 text-sm font-black text-white shadow-[0_0_34px_rgba(255,107,53,0.3)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(255,107,53,0.5)]"
              >
                {primaryCtaText}
                <SvgIcon name="arrow-diagonal" size={16} color="white" />
              </Link>

              <Link
                href={secondaryCtaLink}
                className="group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-black text-white backdrop-blur-sm transition duration-300 hover:bg-white/20 hover:scale-[1.02]"
              >
                {secondaryCtaText}
                <SvgIcon name="arrow-diagonal" size={16} color="white" />
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {bullets.slice(0, 3).map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.13em] text-white backdrop-blur-sm"
                >
                  <SvgIcon name="verified" size={11} color="var(--accent)" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Dashboard Mockup */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative min-w-0"
          >
            <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-[var(--shadow-lg)] backdrop-blur-sm sm:max-w-[520px] sm:p-4 lg:max-w-[580px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.13),transparent_42%)]" />

              <div className="relative aspect-[14/12] overflow-hidden rounded-[1.5rem] border border-white/20 bg-white/5">
                {video_url ? (
                  <video
                    src={video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={backgroundImage}
                    className="h-full w-full object-contain lg:object-cover"
                  />
                ) : backgroundImage ? (
                  <img
                    src={backgroundImage}
                    alt="Hbee Digitals digital growth system"
                    loading="eager"
                    fetchPriority="high"
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <HeroDashboardMockup />
                )}
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
    <div className="h-full w-full bg-white/5 p-4 backdrop-blur-sm sm:p-6">
      <div className="rounded-[1.4rem] border border-white/20 bg-white/10 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)] sm:text-[11px]">
              Growth Intelligence
            </p>
            <h3 className="mt-2 text-base font-black text-white sm:text-lg">
              Store Health Overview
            </h3>
          </div>
          <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/20 px-3 py-1.5 text-[11px] font-black text-[var(--accent)] backdrop-blur-sm sm:px-4 sm:py-2 sm:text-xs">
            Live
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {[
          ['growth', '+38%', 'Conversion Lift'],
          ['analytics', '94%', 'Store Health'],
          ['security', 'AA', 'Accessibility'],
          ['performance', '91', 'Speed Score'],
        ].map(([icon, value, label]) => (
          <div
            key={label}
            className="rounded-[1.3rem] border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5"
          >
            <SvgIcon name={icon} size={18} color="var(--accent)" />
            <p className="mt-6 text-xl font-black text-white sm:mt-8 sm:text-2xl">
              {value}
            </p>
            <p className="mt-1 text-xs font-semibold text-white/60 sm:text-sm">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-black text-white sm:text-sm">
            Optimization Progress
          </p>
          <p className="text-[11px] text-white/60 sm:text-xs">Last 30 days</p>
        </div>

        <div className="flex h-16 items-end gap-1.5 sm:h-24 sm:gap-2">
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-full bg-gradient-to-t from-[var(--accent)]/40 to-[var(--accent-orange)]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}