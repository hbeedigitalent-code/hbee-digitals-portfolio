'use client'

import { HeroData } from '@/types'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface HeroSectionProps {
  data: HeroData & { welcomeText?: string; featureBullets?: string | string[] }
}

function TypewriterText({ text, speed = 80 }: { text: string; speed?: number }) {
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
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
  }, [displayText, isDeleting, text, speed])

  return (
    <span>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        className="inline-block w-[3px] h-[0.8em] bg-blue-400 ml-1"
      />
    </span>
  )
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
    featureBullets = ''
  } = data

  // Handle featureBullets as either string (with | separator) or array
  let bullets: string[] = []
  if (Array.isArray(featureBullets)) {
    bullets = featureBullets
  } else if (typeof featureBullets === 'string' && featureBullets.length > 0) {
    bullets = featureBullets.split('|').filter(Boolean)
  } else {
    bullets = ['Web Development', 'UI/UX Design', 'Digital Marketing', 'Brand Strategy']
  }

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20 lg:pt-28 pb-12" style={{ backgroundColor: 'var(--primary-color, #0A1D37)' }}>
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Mobile Image */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="lg:hidden w-full max-w-sm mx-auto">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-white/10">
              {backgroundImage ? (
                <img src={backgroundImage} alt="Hero" className="w-full h-auto object-cover aspect-[4/3]" />
              ) : (
                <div className="aspect-[4/3] bg-white/5 flex items-center justify-center">
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>

          {/* LEFT CONTENT */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="text-center lg:text-left">
            
            <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs sm:text-sm mb-5 backdrop-blur-sm border border-white/5">
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Available for Projects
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-3">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                <span>{welcomeText}</span>{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  <TypewriterText text="Hbee Digitals" speed={100} />
                </span>
              </h2>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-[1.12] mb-4">
              {title}
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="text-sm sm:text-base text-white/60 max-w-lg mx-auto lg:mx-0 mb-5 leading-relaxed">
              {subtitle}
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="flex flex-wrap gap-3 mb-6 justify-center lg:justify-start">
              {bullets.map((bullet, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.15 }} className="flex items-center gap-2 px-3 py-1.5 bg-white/8 rounded-full text-white/80 text-xs sm:text-sm border border-white/10">
                  <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {bullet}
                </motion.div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href={primaryCtaLink || '/contact'} className="px-6 py-3 bg-white rounded-xl font-semibold text-sm hover:shadow-xl hover:scale-[1.03] transition-all inline-flex items-center gap-2" style={{ color: 'var(--primary-color)' }}>
                {primaryCtaText}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link href={secondaryCtaLink || '/projects'} className="px-6 py-3 border border-white/25 text-white rounded-xl font-semibold text-sm hover:bg-white/10 transition-all inline-flex items-center gap-2">
                {secondaryCtaText}
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="flex items-center gap-x-4 gap-y-2 mt-6 justify-center lg:justify-start text-white/40 text-xs">
              <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>Verified Agency</div>
              <span className="text-white/20 hidden sm:block">|</span>
              <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>On-Time Delivery</div>
            </motion.div>
          </motion.div>

          {/* Desktop Image (RIGHT) */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="hidden lg:block relative">
            <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 25, ease: "linear" }} className="absolute -top-4 -right-4 w-16 h-16 border border-white/10 rounded-full" />
            <motion.div whileHover={{ y: -5 }} className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              {backgroundImage ? (
                <img src={backgroundImage} alt="Hero" className="w-full h-auto object-cover" />
              ) : (
                <div className="aspect-[4/3] bg-white/5 flex items-center justify-center">
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </motion.div>
                </div>
              )}
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} whileHover={{ scale: 1.03 }} className="absolute -bottom-3 -left-3 bg-white rounded-xl shadow-lg px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"><span className="text-white font-bold text-sm">5+</span></div>
              <div className="whitespace-nowrap"><p className="font-semibold text-xs text-gray-900">Years Exp</p><p className="text-[10px] text-gray-500">Trusted Partner</p></div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}>
          <span className="text-white/25 text-[10px] uppercase">Scroll</span>
          <div className="w-4 h-7 rounded-full border border-white/15 flex items-start justify-center p-1"><div className="w-1 h-1.5 rounded-full bg-white/30" /></div>
        </motion.div>
      </motion.div>
    </section>
  )
}