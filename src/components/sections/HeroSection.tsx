'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { HeroData } from '@/types'
import SvgIcon from '@/components/ui/SvgIcon'

interface HeroSectionProps {
  data: HeroData & {
    welcomeText?: string
    featureBullets?: string | string[]
  }
}

function TypewriterWords({ words }: { words: string[] }) {
  const [wordIndex, setWordIndex] = useState(0)
  const [text, setText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex]
    const speed = isDeleting ? 38 : 70

    const timeout = setTimeout(() => {
      if (!isDeleting && text === currentWord) {
        setTimeout(() => setIsDeleting(true), 950)
        return
      }

      if (isDeleting && text === '') {
        setIsDeleting(false)
        setWordIndex((prev) => (prev + 1) % words.length)
        return
      }

      setText((prev) =>
        isDeleting
          ? currentWord.substring(0, prev.length - 1)
          : currentWord.substring(0, prev.length + 1)
      )
    }, speed)

    return () => clearTimeout(timeout)
  }, [text, isDeleting, wordIndex, words])

  return (
    <span className="relative inline-block min-w-[250px] sm:min-w-[330px] lg:min-w-[400px]">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {text}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75"
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

      <span className="relative z-10 ml-1 inline-block h-[0.85em] w-[4px] translate-y-1 rounded-full bg-[#39D97A] animate-pulse" />
    </span>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-xl">
      <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl border border-[#39D97A]/20 bg-[#39D97A]/10">
        <SvgIcon name={icon} size={17} color="#39D97A" />
      </div>
      <div className="text-lg font-black tracking-tight text-white">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium text-white/45">{label}</div>
    </div>
  )
}

function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[430px] lg:max-w-[430px] xl:max-w-[465px]">
      <div className="absolute -inset-8 rounded-full bg-[#39D97A]/14 blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#071427]/90 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
      >
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#39D97A]">
              Growth Intelligence
            </p>
            <h3 className="mt-1 text-sm font-bold text-white">Store Health Overview</h3>
          </div>

          <div className="rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-3 py-1 text-[10px] font-bold text-[#39D97A]">
            Live
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Conversion Lift" value="+38%" icon="growth" />
          <StatCard label="Store Health" value="94%" icon="analytics" />
          <StatCard label="Accessibility" value="AA" icon="security" />
          <StatCard label="Speed Score" value="91" icon="performance" />
        </div>

        <div className="mt-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-white">Optimization Progress</p>
            <p className="text-[10px] text-white/45">Last 30 days</p>
          </div>

          <div className="flex h-16 items-end gap-1.5">
            {[38, 52, 46, 64, 72, 68, 88, 78, 94, 84, 100, 92].map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.7, delay: 0.35 + index * 0.035 }}
                className="flex-1 rounded-t-full bg-gradient-to-t from-[#39D97A]/35 to-[#C6F135]"
              />
            ))}
          </div>
        </div>

        <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
              <SvgIcon name="precision" size={15} color="#39D97A" />
              Audit Fixes
            </div>

            <div className="space-y-1.5">
              {['Checkout friction reduced', 'Trust signals improved', 'Mobile UX optimized'].map(
                (item) => (
                  <div key={item} className="flex items-center gap-2 text-[10px] text-white/55">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#39D97A]" />
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
              <SvgIcon name="strategy" size={15} color="#C6F135" />
              Growth Focus
            </div>

            <p className="text-[10px] leading-relaxed text-white/55">
              Conversion, accessibility, performance, and revenue-focused UX.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function HeroSection({ data }: HeroSectionProps) {
  const reducedMotion = useReducedMotion()

  const {
    primaryCtaText = 'Get Free Audit',
    primaryCtaLink = '/contact',
    secondaryCtaText = 'View Case Studies',
    secondaryCtaLink = '/projects',
    featureBullets = '',
  } = data || {}

  const words = useMemo(
    () => ['Shopify Brands.', 'Online Stores.', 'E-commerce Teams.', 'Scaling Businesses.'],
    []
  )

  let bullets: string[] = []

  if (Array.isArray(featureBullets)) {
    bullets = featureBullets
  } else if (typeof featureBullets === 'string' && featureBullets.trim().length > 0) {
    bullets = featureBullets.split('|').filter(Boolean)
  } else {
    bullets = ['Shopify Optimization', 'Conversion Systems', 'Accessibility Support']
  }

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[82vh] items-center overflow-hidden bg-[#060E1C] pt-24 text-white md:pt-28"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[720px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-[#C6F135]/8 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060E1C]/10 via-transparent to-[#060E1C]" />
      </div>

      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 pb-10 md:px-10 lg:grid-cols-[1fr_0.9fr] lg:gap-10">
        <div className="text-center lg:text-left">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#39D97A]"
          >
            <span className="h-2 w-2 rounded-full bg-[#39D97A]" />
            Digital Growth Systems
          </motion.div>

          <motion.h1
            id="hero-heading"
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-5xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl lg:mx-0 lg:text-[4.35rem] xl:text-[4.9rem]"
          >
            Engineering Growth For <br />
            <TypewriterWords words={words} />
          </motion.h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: 0.2 }}
            className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/68 lg:mx-0"
          >
            We build scalable digital systems, conversion-focused experiences, and growth
            infrastructure for ambitious e-commerce brands.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: 0.32 }}
            className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
          >
            <Link
              href={primaryCtaLink || '/contact'}
              className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-7 py-3 text-sm font-black text-[#06101F] shadow-[0_0_36px_rgba(57,217,122,0.24)] transition hover:scale-[1.02]"
            >
              {primaryCtaText}
              <SvgIcon
                name="arrow-diagonal"
                size={16}
                color="#06101F"
                className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>

            <Link
              href={secondaryCtaLink || '/projects'}
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-7 py-3 text-sm font-bold text-white/82 backdrop-blur-xl transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 hover:text-white"
            >
              {secondaryCtaText}
            </Link>
          </motion.div>

          <motion.ul
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: 0.42 }}
            className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2.5 lg:mx-0 lg:justify-start"
          >
            {bullets.map((item) => (
              <li
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-xl"
              >
                {item}
              </li>
            ))}
          </motion.ul>
        </div>

        <DashboardMockup />
      </div>
    </section>
  )
}