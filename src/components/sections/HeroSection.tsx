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
    <span className="inline-block">
      <span className="inline-block whitespace-nowrap bg-gradient-to-r from-[var(--accent)] via-[var(--accent-lime)] to-[var(--accent-orange)] bg-clip-text text-transparent">
        {text}
        {!reducedMotion && active && (
          <span className="ml-1 inline-block h-[0.8em] w-[2px] animate-pulse rounded-full bg-[var(--accent-orange)]" />
        )}
      </span>
      <svg
        className="absolute -bottom-2 left-0 h-3 w-full text-[var(--accent)]/70 sm:-bottom-2 sm:h-4"
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
      className="relative overflow-hidden bg-[var(--bg-page)] px-5 pt-24 pb-10 sm:px-6 md:px-10 lg:pt-28 lg:pb-16"
    >
      {/* Light brand-appropriate background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[280px] w-[280px] rounded-full bg-[var(--accent)]/5 blur-[90px] sm:h-[350px] sm:w-[350px] sm:blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[var(--accent-lime)]/5 blur-[90px] sm:h-[300px] sm:w-[300px] sm:blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center, rgba(57,217,122,0.04), transparent 70%)]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
          {/* Left Column - Content */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full lg:w-1/2"
          >
            {/* Top badge */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent)] sm:px-4 sm:py-2 sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] sm:h-2 sm:w-2" />
              Digital Growth Systems
            </div>

            {/* Main Title - Properly structured */}
            <h1 className="text-4xl font-black leading-[1.2] tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl md:text-6xl lg:text-7xl">
              <div className="mb-2">{baseTitle}</div>
              <div className="relative inline-block">
                <TypewriterWord active={isInView} reducedMotion={reducedMotion} />
              </div>
            </h1>

            <p className="mt-6 text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">
              {subtitle}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={primaryCtaLink}
                className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-orange-green px-6 py-3 text-sm font-black text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg sm:px-7"
              >
                {primaryCtaText}
                <SvgIcon name="arrow-diagonal" size={14} color="white" />
              </Link>

              <Link
                href={secondaryCtaLink}
                className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-6 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)] sm:px-7"
              >
                {secondaryCtaText}
                <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
              </Link>
            </div>

            {/* Feature bullets */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {bullets.slice(0, 3).map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--text-secondary)] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[10px]"
                >
                  <SvgIcon name="verified" size={9} color="var(--accent)" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Image */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full lg:w-1/2"
          >
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[380px] md:max-w-[440px] lg:max-w-[480px]">
              {/* Soft glow behind image */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[var(--accent)]/10 via-[var(--accent-lime)]/5 to-[var(--accent-orange)]/10 blur-2xl" />
              
              {/* Image container */}
              <div className="relative overflow-hidden rounded-2xl bg-[var(--bg-card)] shadow-xl">
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
                      alt=""
                      loading="eager"
                      fetchPriority="high"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}