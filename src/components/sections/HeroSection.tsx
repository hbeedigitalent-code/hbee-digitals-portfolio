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

// Trust Bar Component
function TrustBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="mt-3 flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-[var(--text-muted)]"
    >
      <span className="flex items-center gap-1.5">
        <SvgIcon name="verified" size={12} color="var(--accent)" />
        <span>No-risk consultation</span>
      </span>
      <span className="hidden xs:inline text-[var(--border)]">|</span>
      <span className="flex items-center gap-1.5">
        <SvgIcon name="verified" size={12} color="var(--accent)" />
        <span>Transparent pricing</span>
      </span>
      <span className="hidden xs:inline text-[var(--border)]">|</span>
      <span className="flex items-center gap-1.5">
        <SvgIcon name="verified" size={12} color="var(--accent)" />
        <span>Ongoing support</span>
      </span>
    </motion.div>
  )
}

export default function HeroSection({ data }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const isInView = useInView(sectionRef, { amount: 0.25, once: true })
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
      className="relative min-h-[75vh] sm:min-h-[80vh] lg:min-h-[75vh] overflow-hidden bg-[var(--bg-page)] px-5 sm:px-6 md:px-10 lg:px-12 flex items-center pt-14 sm:pt-16 md:pt-20"
    >
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-[280px] w-[280px] rounded-full bg-[var(--blue-500)]/5 blur-[90px] sm:h-[350px] sm:w-[350px] sm:blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[var(--accent)]/5 blur-[90px] sm:h-[300px] sm:w-[300px] sm:blur-[100px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl">
        {/* Equal height columns on desktop */}
        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-stretch lg:gap-10">
          
          {/* ============================================================ */}
          {/* CONTENT - 55% | Vertically centered within the column         */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="order-2 w-full lg:order-1 lg:w-[55%] flex flex-col justify-center"
          >
            <div className="max-w-[560px] mx-auto lg:mx-0 w-full py-2 lg:py-0">
              {/* Badge - Using star.svg from public/svgs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1.5 mb-2 md:mb-3">
                  <SvgIcon name="star" size={12} color="var(--accent)" />
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                    DIGITAL GROWTH AGENCY
                  </span>
                </div>
              </motion.div>

              {/* Headline - Proper mobile hierarchy */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-[clamp(1.8rem,5vw,3rem)] sm:text-[clamp(2rem,4.5vw,3.5rem)] lg:text-[clamp(2.2rem,3.5vw,4rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)]"
              >
                <div>Engineering Digital</div>
                <div>Growth Systems For</div>
                <div className="relative inline-block mt-0.5">
                  <TypewriterWord active={isInView} reducedMotion={reducedMotion} />
                </div>
              </motion.h1>

              {/* Description - Proper mobile hierarchy */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mt-2 md:mt-3 text-sm sm:text-base md:text-lg leading-[1.6] text-[var(--text-secondary)] max-w-[520px]"
              >
                {subtitle}
              </motion.p>

              {/* CTA Button - Increased size */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-4 md:mt-5"
              >
                <motion.button
                  onClick={() => setIsConsultationOpen(true)}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="relative inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-black rounded-full overflow-hidden transition-all duration-300"
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

              {/* Trust Bar */}
              <TrustBar />
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* IMAGE - 45% | Sets the height for both columns                */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            className="order-1 w-full lg:order-2 lg:w-[45%] flex items-center"
          >
            <div className="hero-image-wrapper mx-auto lg:mx-0 lg:ml-auto w-full">
              <div className="relative overflow-hidden rounded-2xl shadow-[var(--shadow-xl)]">
                <div className="relative aspect-[7/5] overflow-hidden bg-[var(--bg-section)]">
                  {video_url ? (
                    <video
                      src={video_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      poster={backgroundImage}
                      className="h-full w-full object-contain"
                    />
                  ) : backgroundImage ? (
                    <img
                      src={backgroundImage}
                      alt="Hbee Digitals - Digital Growth Studio"
                      loading="eager"
                      fetchPriority="high"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[var(--bg-section)] to-[var(--bg-card)]" />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Consultation Popup Modal */}
      <ConsultationPopup
        isOpen={isConsultationOpen}
        onClose={() => setIsConsultationOpen(false)}
      />

      {/* ============================================================ */}
      {/* INLINE STYLES FOR IMAGE WRAPPER                               */}
      {/* ============================================================ */}
      <style jsx>{`
        .hero-image-wrapper {
          max-width: 240px;
          width: 100%;
          margin: 0 auto 12px;
        }

        @media (min-width: 640px) {
          .hero-image-wrapper {
            max-width: 300px;
            margin: 0 auto 16px;
          }
        }

        @media (min-width: 768px) {
          .hero-image-wrapper {
            max-width: 340px;
          }
        }

        @media (min-width: 1024px) {
          .hero-image-wrapper {
            max-width: 440px;
            width: 100%;
            margin: 0;
          }
        }

        .hero-image-wrapper .aspect-\\[7\\/5\\] {
          aspect-ratio: 7 / 5;
        }

        /* Hide separator on very small screens */
        @media (max-width: 400px) {
          .xs\\:inline {
            display: none !important;
          }
        }
      `}</style>
    </section>
  )
}