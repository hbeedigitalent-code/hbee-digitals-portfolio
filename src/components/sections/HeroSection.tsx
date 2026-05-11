'use client'

import { HeroData } from '@/types'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useState, useEffect } from 'react'

function TypewriterText({ text, speed = 80 }: { text: string; speed?: number }) {
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(text)
      return
    }
    let timeout: NodeJS.Timeout
    if (!isDeleting && displayText === text) {
      timeout = setTimeout(() => setIsDeleting(true), 3000)
    } else if (isDeleting && displayText === '') {
      timeout = setTimeout(() => setIsDeleting(false), 1000)
    } else if (isDeleting) {
      timeout = setTimeout(() => setDisplayText(text.substring(0, displayText.length - 1)), speed / 2)
    } else {
      timeout = setTimeout(() => setDisplayText(text.substring(0, displayText.length + 1)), speed)
    }
    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, text, speed, prefersReducedMotion])

  if (prefersReducedMotion) return <span>{text}</span>

  return (
    <span>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
        className="inline-block w-[3px] h-[0.8em] bg-blue-400 ml-1"
        aria-hidden="true"
      />
    </span>
  )
}

interface HeroSectionProps {
  data: HeroData & { welcomeText?: string; featureBullets?: string | string[] }
}

export default function HeroSection({ data }: HeroSectionProps) {
  const {
    title = 'We Build Exceptional Digital Experiences That Drive Growth',
    subtitle = 'Transform your business with cutting-edge technology and creative design.',
    primaryCtaText = 'Get Started',
    primaryCtaLink = '/contact',
    secondaryCtaText = 'View Work',
    secondaryCtaLink = '/projects',
    backgroundImage,
    welcomeText = 'Welcome to',
    featureBullets = '',
  } = data

  const reducedMotion = useReducedMotion()

  let bullets: string[] = []
  if (Array.isArray(featureBullets)) {
    bullets = featureBullets
  } else if (typeof featureBullets === 'string' && featureBullets.trim().length > 0) {
    bullets = featureBullets.split('|').filter(Boolean)
  } else {
    bullets = ['Web Development', 'UI/UX Design', 'Digital Marketing', 'Brand Strategy']
  }

  const titleWords = (title || '').split(' ')

  return (
    <section
      className="relative min-h-[90vh] flex items-center overflow-hidden pt-24 lg:pt-28 pb-12"
      style={{ backgroundColor: 'var(--primary-color)' }}
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-20" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-cyan-500 rounded-full blur-[120px] opacity-15" />
      </div>

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* LEFT COLUMN */}
          <div className="text-center lg:text-left w-full">
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-4"
            >
              <p
                className="text-xl sm:text-2xl lg:text-3xl font-bold"
                style={{ fontFamily: 'var(--heading-font)', color: 'var(--secondary-color)' }}
              >
                {welcomeText}{' '}
                <span className="gradient-text">
                  <TypewriterText text="Hbee Digitals" speed={100} />
                </span>
              </p>
            </motion.div>

            <motion.h1
              id="hero-heading"
              className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-[1.1] mb-5"
              style={{ fontFamily: 'var(--heading-font)' }}
              aria-label={title}
            >
              {reducedMotion
                ? title
                : titleWords.map((word, i) => (
                    <span
                      key={i}
                      className="inline-block overflow-hidden mr-[0.25em]"
                      aria-hidden="true"
                    >
                      <motion.span
                        className="inline-block gradient-text"
                        initial={{ y: '110%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{
                          duration: 0.65,
                          delay: 0.3 + i * 0.08,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {word}
                      </motion.span>
                    </span>
                  ))}
            </motion.h1>

            <motion.p
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-sm sm:text-base max-w-lg mx-auto lg:mx-0 mb-6 leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {subtitle}
            </motion.p>

            <motion.ul
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.85 }}
              className="flex flex-wrap gap-2.5 mb-7 justify-center lg:justify-start"
              aria-label="Key services"
            >
              {bullets.map((b, i) => (
                <motion.li
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 rounded-full text-xs sm:text-sm border backdrop-blur-sm"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}
                >
                  <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" aria-hidden="true" focusable="false" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {b}
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6"
            >
              <Link
                href={primaryCtaLink || '/contact'}
                className="relative group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm overflow-hidden transition-all duration-500"
                style={{ minHeight: '48px' }}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#007BFF] via-[#00BFFF] to-[#007BFF] bg-[length:200%_100%] animate-shimmer group-hover:animate-shimmer-fast transition-all" />
                <span className="relative z-10 flex items-center gap-2 text-white">
                  {primaryCtaText}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link
                href={secondaryCtaLink || '/projects'}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border rounded-full font-semibold text-sm hover:bg-white/10 transition-all"
                style={{ minHeight: '48px', borderColor: 'var(--card-border)', color: 'var(--secondary-color)' }}
              >
                {secondaryCtaText}
              </Link>
            </motion.div>

            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="flex items-center gap-3 justify-center lg:justify-start"
              aria-label="Client reviews — 5 stars, trusted by 50+ store owners"
            >
              <div className="flex -space-x-2">
                {['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400'].map((color, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full border-2 border-white/20 ${color}`} />
                ))}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="text-yellow-400">★★★★★</span> Trusted by <strong style={{ color: 'var(--secondary-color)' }}>50+</strong> store owners
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN — normal size image / placeholder */}
          <motion.div
            initial={reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="relative w-full max-w-md lg:max-w-none mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ borderColor: 'var(--card-border)', borderWidth: '1px' }}>
              {(data as any).video_url ? (
                <div className="aspect-video">
                  <iframe
                    src={(data as any).video_url}
                    title="Hero video"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : backgroundImage ? (
                <img src={backgroundImage} alt={title || 'Hero'} className="w-full h-auto object-cover" />
              ) : (
                <div className="aspect-[4/3] bg-white/5 flex items-center justify-center">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center"
                  >
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </motion.div>
                </div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              whileHover={{ scale: 1.03 }}
              className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2.5 flex items-center gap-2.5"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">5+</span>
              </div>
              <div className="whitespace-nowrap">
                <p className="font-semibold text-xs text-gray-900">Years Exp</p>
                <p className="text-[10px] text-gray-500">Trusted Partner</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
      >
        <button
          onClick={() => window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' })}
          className="flex flex-col items-center gap-1 transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Scroll to next section"
        >
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <span className="w-4 h-7 rounded-full border border-white/20 flex justify-center pt-1">
            <span className="w-1 h-1.5 rounded-full bg-white/40 animate-bounce" />
          </span>
        </button>
      </motion.div>
    </section>
  )
}