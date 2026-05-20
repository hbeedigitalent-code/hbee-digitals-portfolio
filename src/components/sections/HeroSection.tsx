'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface HeroSectionProps {
  data: {
    title?: string
    subtitle?: string
    primaryCtaText?: string
    primaryCtaLink?: string
    secondaryCtaText?: string
    secondaryCtaLink?: string
    backgroundImage?: string
    featureBullets?: string
    video_url?: string
  }
}

const rotatingWords = ['Shopify Stores.', 'Online Stores.', 'Modern Brands.', 'Digital Growth.']

function cleanHeroTitle(title?: string) {
  return (title || 'Engineering Growth For')
    .replace(/Modern Brands\.?/gi, '')
    .replace(/Shopify Stores\.?/gi, '')
    .replace(/Online Stores\.?/gi, '')
    .replace(/Digital Growth\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function HeroSection({ data }: HeroSectionProps) {
  const reducedMotion = useReducedMotion()
  const [wordIndex, setWordIndex] = useState(0)
  const [typedText, setTypedText] = useState('')

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

  const cleanTitle = cleanHeroTitle(title)

  const bullets = useMemo(() => {
    return featureBullets
      ? featureBullets.split('|').filter(Boolean)
      : ['Brand Identity', '24/7 Support']
  }, [featureBullets])

  useEffect(() => {
    if (reducedMotion) {
      setTypedText(rotatingWords[0])
      return
    }

    const currentWord = rotatingWords[wordIndex]
    let charIndex = 0
    setTypedText('')

    const typing = window.setInterval(() => {
      charIndex += 1
      setTypedText(currentWord.slice(0, charIndex))

      if (charIndex >= currentWord.length) {
        window.clearInterval(typing)
        window.setTimeout(() => {
          setWordIndex((prev) => (prev + 1) % rotatingWords.length)
        }, 1600)
      }
    }, 68)

    return () => window.clearInterval(typing)
  }, [wordIndex, reducedMotion])

  const underlineWidth = `${Math.min(Math.max(typedText.length * 34, 180), 620)}px`

  return (
    <section className="relative overflow-hidden bg-[#07111F] pb-12 pt-28 text-white sm:pb-14 sm:pt-32 lg:min-h-screen lg:pb-16 lg:pt-32">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[360px] w-[460px] rounded-full bg-[#39D97A]/7 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[330px] w-[420px] rounded-full bg-[#C6F135]/5 blur-[110px]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 md:px-10 lg:grid-cols-[0.94fr_1.06fr] lg:px-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <span className="h-2 w-2 rounded-full bg-[#39D97A]" />
            DIGITAL GROWTH SYSTEMS
          </div>

          <h1 className="max-w-4xl text-[3.45rem] font-black leading-[0.9] tracking-[-0.07em] text-white sm:text-6xl md:text-7xl xl:text-[5.2rem]">
            {cleanTitle}
            <br />

            <span className="relative inline-block min-h-[1.08em]">
              <span className="inline-block bg-gradient-to-r from-[#39D97A] via-[#6EEB73] to-[#C6F135] bg-clip-text text-transparent">
                {typedText}
                <span className="ml-1 inline-block h-[0.82em] w-[4px] translate-y-[6px] animate-pulse rounded-full bg-[#C6F135]" />
              </span>

              <svg
                className="absolute -bottom-2 left-0 h-5 text-[#39D97A]/75 transition-all duration-300"
                style={{ width: underlineWidth, maxWidth: '100%' }}
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
          </h1>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/66 sm:text-base md:text-lg md:leading-8">
            {subtitle}
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={primaryCtaLink}
              className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full bg-[#39D97A] px-7 py-4 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              {primaryCtaText}
              <SvgIcon name="arrow-diagonal" size={17} color="#06101F" />
            </Link>

            <Link
              href={secondaryCtaLink}
              className="group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-7 py-4 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
            >
              {secondaryCtaText}
              <SvgIcon name="arrow-diagonal" size={17} color="#39D97A" />
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {bullets.map((item) => (
              <div
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#0E1B2D] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]"
              >
                <SvgIcon name="security" size={11} color="#39D97A" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            {[
              ['98%', 'Success Rate'],
              ['45+', 'Brands Supported'],
              ['5★', 'Client Feedback'],
            ].map(([value, label], index) => (
              <div key={label} className="flex items-center gap-5">
                <div>
                  <p className="text-3xl font-black text-white sm:text-4xl">{value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/42 sm:text-xs">
                    {label}
                  </p>
                </div>

                {index !== 2 && <div className="hidden h-11 w-px bg-[#1E314A] sm:block" />}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-4 shadow-[0_36px_100px_rgba(0,0,0,0.3)]">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-[#1E314A] bg-[#07111F]">
              {video_url ? (
                <video
                  src={video_url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={backgroundImage}
                  className="h-full min-h-[390px] w-full object-cover sm:min-h-[500px] lg:min-h-[570px]"
                />
              ) : backgroundImage ? (
                <img
                  src={backgroundImage}
                  alt="Hbee Digitals digital growth dashboard"
                  loading="eager"
                  fetchPriority="high"
                  className="h-full min-h-[390px] w-full object-cover sm:min-h-[500px] lg:min-h-[570px]"
                />
              ) : (
                <DashboardMockup />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function DashboardMockup() {
  const bars = [34, 46, 40, 52, 61, 55, 72, 63, 78, 67, 86, 79]

  return (
    <div className="min-h-[390px] bg-[#07111F] p-4 sm:min-h-[500px] sm:p-6 lg:min-h-[570px]">
      <div className="rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D] p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#39D97A]">
          Growth Intelligence
        </p>
        <h3 className="mt-2 text-lg font-black text-white">Store Health Overview</h3>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        {[
          ['growth', '+38%', 'Conversion Lift'],
          ['analytics', '94%', 'Store Health'],
          ['security', 'AA', 'Accessibility'],
          ['performance', '91', 'Speed Score'],
        ].map(([icon, value, label]) => (
          <div key={label} className="rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D] p-5">
            <SvgIcon name={icon} size={20} color="#39D97A" />
            <p className="mt-8 text-2xl font-black text-white">{value}</p>
            <p className="mt-1 text-sm font-semibold text-white/42">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D] p-5">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-black text-white">Optimization Progress</p>
          <p className="text-xs text-white/45">Last 30 days</p>
        </div>

        <div className="flex h-24 items-end gap-2">
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-full bg-gradient-to-t from-[#39D97A]/45 to-[#C6F135]"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}