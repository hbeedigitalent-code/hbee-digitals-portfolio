'use client'

import { HeroData } from '@/types'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface HeroSectionProps {
  data: HeroData
}

function TypewriterText({ text, className = '', speed = 80 }: { text: string; className?: string; speed?: number }) {
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isDeleting && displayText === text) {
      timeout = setTimeout(() => setIsDeleting(true), 2500)
    } else if (isDeleting && displayText === '') {
      timeout = setTimeout(() => setIsDeleting(false), 800)
    } else if (isDeleting) {
      timeout = setTimeout(() => setDisplayText(text.substring(0, displayText.length - 1)), speed / 2)
    } else {
      timeout = setTimeout(() => setDisplayText(text.substring(0, displayText.length + 1)), speed)
    }
    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, text, speed])

  return (
    <span className={className}>
      {displayText}
      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="inline-block w-[3px] h-[0.8em] bg-white ml-0.5 align-middle" />
    </span>
  )
}

function MiniBadge({ text }: { text: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.3, duration: 0.4, type: "spring" }} className="flex items-center gap-1.5">
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a1 1 0 10-1.22-1.585l-4.89 3.764-2.085-1.562a1 1 0 00-1.215 1.588l2.75 2.062a1 1 0 001.218-.002l5.442-4.265z" clipRule="evenodd" />
      </svg>
      <span className="text-white/60 text-xs tracking-wide">{text}</span>
    </motion.div>
  )
}

export default function HeroSection({ data }: HeroSectionProps) {
  const { title = 'We Build Exceptional Digital Experiences That Drive Growth', subtitle = 'Transform your business with cutting-edge technology and creative design.', primaryCtaText = 'Get Started', primaryCtaLink = '/contact', secondaryCtaText = 'View Work', secondaryCtaLink = '/projects', backgroundImage, welcomeText = 'Welcome to' } = data
  const titleWords = (title || '').split(' ')

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-24 lg:pt-28 pb-16" style={{ backgroundColor: 'var(--primary-color, #0A1D37)' }}>
      <div className="absolute inset-0 opacity-[0.07]">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Mobile: Stack vertically with image on top */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Mobile Image (shows first on mobile) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="w-full lg:hidden max-w-sm mx-auto mb-4">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {backgroundImage ? (
                <img src={backgroundImage} alt="Hero" className="w-full h-auto object-cover" />
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-pink-500/15 flex items-center justify-center">
                  <div className="text-center p-6">
                    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-white/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                    </motion.div>
                    <p className="text-white/40 text-xs">Upload image in Admin → Hero</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Left Content */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs sm:text-sm mb-4 backdrop-blur-sm border border-white/5">
              <motion.span animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span>Available for Projects</span>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-4">
              <h2 className="text-base sm:text-lg lg:text-2xl font-light text-white/80 tracking-wide">
                <span className="text-blue-300">{welcomeText || 'Welcome to'}</span>{' '}
                <span className="font-bold text-white"><TypewriterText text="Hbee Digitals" speed={100} /></span>
              </h2>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-2xl sm:text-3xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.1] mb-4">
              {titleWords.map((word, i) => (
                <motion.span key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.08 }} className="inline-block mr-[0.25em]">{word}</motion.span>
              ))}
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="text-sm sm:text-base lg:text-lg text-white/60 max-w-xl mx-auto lg:mx-0 mb-6 leading-relaxed">{subtitle}</motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href={primaryCtaLink || '/contact'} className="px-6 py-3 bg-white rounded-xl font-semibold text-sm hover:shadow-xl hover:scale-[1.03] transition-all duration-200 inline-flex items-center justify-center gap-2" style={{ color: 'var(--primary-color, #0A1D37)' }}>
                {primaryCtaText || 'Get Started'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link href={secondaryCtaLink || '/projects'} className="px-6 py-3 border border-white/25 text-white rounded-xl font-semibold text-sm hover:bg-white/10 transition-all duration-200 inline-flex items-center justify-center gap-2">{secondaryCtaText || 'View Work'}</Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 justify-center lg:justify-start">
              <MiniBadge text="Verified Agency" />
              <MiniBadge text="On-Time Delivery" />
              <MiniBadge text="24/7 Support" />
            </motion.div>
          </motion.div>

          {/* Desktop Image (right side on desktop) */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="relative hidden lg:block">
            <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute -top-4 -right-4 w-16 h-16 border border-white/10 rounded-full" />
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 30, ease: "linear" }} className="absolute -bottom-4 -left-4 w-20 h-20 border border-white/10 rounded-full" />
            <motion.div whileHover={{ y: -5 }} className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {backgroundImage ? (
                <img src={backgroundImage} alt="Hero" className="w-full h-auto object-cover" />
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-blue-500/15 via-purple-500/15 to-pink-500/15 flex items-center justify-center">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  </motion.div>
                </div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} whileHover={{ scale: 1.03 }} className="absolute -bottom-3 -left-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"><span className="text-white font-bold text-sm">5+</span></div>
              <div><p className="font-semibold text-xs text-gray-900">Years Exp</p><p className="text-[10px] text-gray-500">Trusted Partner</p></div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}>
          <span className="text-white/25 text-[10px] tracking-wider uppercase">Scroll</span>
          <div className="w-4 h-7 rounded-full border border-white/15 flex items-start justify-center p-1"><div className="w-1 h-1.5 rounded-full bg-white/30" /></div>
        </motion.div>
      </motion.div>
    </section>
  )
}