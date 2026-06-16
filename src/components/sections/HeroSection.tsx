'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import ConsultationPopup from '@/components/ConsultationPopup'
import Button from '@/components/ui/Button'

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

// Short, punchy two-word phrases for typewriter (line 3)
const words = [
  'Online Stores',
  'Modern Brands',
  'Shopify Stores',
  'Brand Identity',
  'Customer Trust',
  'Sales Revenue',
  'Store Success'
]

function TypewriterWord({
  active,
  reducedMotion,
}: {
  active: boolean
  reducedMotion: boolean
}) {
  const [wordIndex, setWordIndex] = useState(0)
  const [text, setText] = useState(words[0])
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    if (reducedMotion || !active) {
      setText(words[wordIndex])
      return
    }

    const current = words[wordIndex]
    let index = 0
    setText('')
    setIsTyping(true)

    const typing = setInterval(() => {
      index += 1
      setText(current.slice(0, index))

      if (index >= current.length) {
        clearInterval(typing)
        setIsTyping(false)
        setTimeout(() => {
          setWordIndex((prev) => (prev + 1) % words.length)
        }, 1800)
      }
    }, 80)

    return () => clearInterval(typing)
  }, [wordIndex, active, reducedMotion])

  return (
    <span className="inline-block">
      <span className="inline-block whitespace-nowrap bg-gradient-to-r from-[var(--blue-500)] via-[var(--blue-600)] to-[var(--accent)] bg-clip-text text-transparent font-bold">
        {text}
        {!reducedMotion && active && isTyping && (
          <span className="ml-1 inline-block h-[0.8em] w-[2px] animate-pulse rounded-full bg-gradient-to-r from-[var(--blue-500)] to-[var(--accent)]" />
        )}
      </span>
      <svg
        className="absolute -bottom-2 left-0 h-3 w-full sm:-bottom-2 sm:h-4"
        viewBox="0 0 260 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="underlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--blue-500)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <path
          d="M5 13C62 2 168 2 255 11"
          stroke="url(#underlineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  )
}

export default function HeroSection({ data }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const isInView = useInView(sectionRef, { amount: 0.35, once: true })
  const reducedMotion = Boolean(useReducedMotion())
  const [isConsultationOpen, setIsConsultationOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const {
    subtitle = 'We build scalable digital systems, conversion-focused experiences, and growth infrastructure for ambitious e-commerce and modern businesses.',
    primaryCtaText = 'Get Free Consultation',
    backgroundImage,
    video_url,
  } = data || {}

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[var(--bg-page)] px-5 py-12 sm:px-6 md:px-10 lg:py-20"
    >
      {/* Light background glow - using CSS variables */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[280px] w-[280px] rounded-full bg-[var(--blue-500)]/5 blur-[90px] sm:h-[350px] sm:w-[350px] sm:blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[var(--accent)]/5 blur-[90px] sm:h-[300px] sm:w-[300px] sm:blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-12">
          
          {/* IMAGE - First on mobile, Right on desktop */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="order-1 w-full lg:order-2 lg:w-1/2"
          >
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[380px] md:max-w-[440px] lg:max-w-[480px]">
              {/* Subtle glow behind image */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[var(--blue-500)]/10 via-[var(--accent)]/5 to-transparent blur-2xl" />
              
              {/* Clean image container */}
              <div className="relative overflow-hidden rounded-2xl shadow-[var(--shadow-xl)]">
                <div className="relative aspect-square overflow-hidden">
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
                      alt="Hbee Digitals - Digital Growth Studio"
                      loading="eager"
                      fetchPriority="high"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[var(--bg-section)] to-[var(--bg-card)]" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* TEXT - Second on mobile, Left on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="order-2 w-full lg:order-1 lg:w-1/2"
          >
            {/* Section Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-5">
                <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                  DIGITAL GROWTH AGENCY
                </span>
              </div>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.2] tracking-[-0.02em] text-[var(--text-primary)]"
            >
              <div className="mb-1 whitespace-nowrap sm:whitespace-normal">Engineering Digital</div>
              <div className="mb-1 whitespace-nowrap sm:whitespace-normal">Growth Systems For</div>
              <div className="relative inline-block mt-1">
                <TypewriterWord active={isInView} reducedMotion={reducedMotion} />
              </div>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8 max-w-lg"
            >
              {subtitle}
            </motion.p>

            {/* CTA Button with two-color hover animation */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-8"
            >
              <motion.button
                onClick={() => setIsConsultationOpen(true)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="relative inline-flex items-center gap-2 px-8 py-3.5 text-sm font-black rounded-full overflow-hidden transition-all duration-300"
                whileTap={{ scale: 0.97 }}
                animate={{
                  backgroundColor: isHovered ? 'var(--accent)' : 'var(--navy-800)',
                  boxShadow: isHovered 
                    ? '0 10px 25px -5px rgba(249,115,22,0.4)' 
                    : '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <span className="relative z-10 text-white">
                  {primaryCtaText}
                </span>
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative z-10"
                  animate={{
                    x: isHovered ? 4 : 0,
                    y: isHovered ? -2 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </motion.svg>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Consultation Popup Modal */}
      <ConsultationPopup
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
      />
    </section>
  )
}