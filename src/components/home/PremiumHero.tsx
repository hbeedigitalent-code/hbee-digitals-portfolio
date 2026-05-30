'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface PortfolioItem {
  id: string
  title?: string
  client_name?: string
  featured_image?: string
  image_url?: string
  slug?: string
}

interface Props {
  portfolioItems: PortfolioItem[]
}

const heroImages = [
  { src: '/Portfolio/neuro-energy.jpg', alt: 'Neuro Energy — Shopify Store' },
  { src: '/Portfolio/bell-lifestyle.jpg', alt: 'Bell Lifestyle Products' },
]

function FloatingStatBadge({
  icon,
  value,
  label,
  className = '',
  delay = 0,
}: {
  icon: string
  value: string
  label: string
  className?: string
  delay?: number
}) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 + delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute z-30 flex items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#0E1B2D]/92 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#39D97A]/20 bg-[#39D97A]/10">
        <SvgIcon name={icon} size={18} color="#39D97A" />
      </div>
      <div>
        <p className="text-lg font-black tracking-[-0.03em] text-white">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</p>
      </div>
    </motion.div>
  )
}

function DeviceMockup({
  image,
  alt,
  type,
  className = '',
}: {
  image: string
  alt: string
  type: 'laptop' | 'phone'
  className?: string
}) {
  if (type === 'phone') {
    return (
      <div className={`relative ${className}`}>
        {/* Phone frame */}
        <div className="relative w-[160px] overflow-hidden rounded-[2rem] border-[3px] border-[#1E314A] bg-[#0E1B2D] p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] sm:w-[180px]">
          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-[#0E1B2D]" />
          {/* Screen */}
          <div className="relative aspect-[9/18.5] overflow-hidden rounded-[1.5rem] bg-[#07111F]">
            <img
              src={image}
              alt={alt}
              className="h-full w-full object-cover"
              loading="eager"
            />
            {/* Screen shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>
        </div>
        {/* Shadow glow */}
        <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-[#39D97A]/8 blur-[30px]" />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Laptop frame */}
      <div className="relative w-[320px] overflow-hidden rounded-t-[1.2rem] border-[3px] border-b-0 border-[#1E314A] bg-[#0E1B2D] p-2 pb-0 shadow-[0_24px_60px_rgba(0,0,0,0.5)] sm:w-[400px] md:w-[460px]">
        {/* Camera dot */}
        <div className="absolute left-1/2 top-1.5 z-20 h-2 w-2 -translate-x-1/2 rounded-full bg-[#1E314A]" />
        {/* Screen */}
        <div className="relative aspect-[16/10.5] overflow-hidden rounded-t-[0.7rem] bg-[#07111F]">
          <img
            src={image}
            alt={alt}
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        </div>
      </div>
      {/* Laptop base */}
      <div className="relative mx-auto h-3 w-[340px] rounded-b-lg bg-gradient-to-b from-[#1E314A] to-[#0E1B2D] shadow-[0_12px_30px_rgba(0,0,0,0.4)] sm:w-[420px] md:w-[480px]">
        <div className="absolute left-1/2 top-0 h-1 w-16 -translate-x-1/2 rounded-b-md bg-[#13233A]" />
      </div>
      {/* Shadow glow */}
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-[#39D97A]/6 blur-[40px]" />
    </div>
  )
}

export default function PremiumHero({ portfolioItems }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { amount: 0.2 })
  const reducedMotion = useReducedMotion()

  // Pick images from portfolio or fall back to defaults
  const laptopProject = portfolioItems[0]
  const phoneProject = portfolioItems[1]

  const laptopImage = laptopProject?.featured_image || laptopProject?.image_url || heroImages[0].src
  const phoneImage = phoneProject?.featured_image || phoneProject?.image_url || heroImages[1].src

  const laptopAlt = laptopProject?.client_name || laptopProject?.title || heroImages[0].alt
  const phoneAlt = phoneProject?.client_name || phoneProject?.title || heroImages[1].alt

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden bg-[#07111F] px-5 pt-28 sm:px-6 sm:pt-32 md:px-10 lg:px-12 lg:pt-36"
    >
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-32 top-20 h-[400px] w-[400px] rounded-full bg-[#39D97A]/6 blur-[120px] sm:h-[500px] sm:w-[500px]" />
        <div className="absolute -right-32 bottom-20 h-[350px] w-[350px] rounded-full bg-[#C6F135]/4 blur-[100px] sm:h-[450px] sm:w-[450px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39D97A]/3 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.015)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
          {/* Left: Text content */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20"
          >
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/8 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#39D97A] animate-pulse-dot" />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                Ecommerce &amp; Growth Partner
              </span>
            </div>

            {/* Heading */}
            <h1 className="max-w-[640px] text-[clamp(2.6rem,8vw,4.2rem)] font-black leading-[0.95] tracking-[-0.055em] text-white">
              We Build Digital Systems That
              <span className="relative ml-3 inline-block text-[#39D97A]">
                Drive Growth.
                <svg
                  className="absolute -bottom-1 left-0 h-3 w-full text-[#39D97A]/60 sm:-bottom-2 sm:h-4"
                  viewBox="0 0 220 14"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 10C50 2 142 2 216 8"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Description */}
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-white/55 sm:text-base sm:leading-8">
              Hbee Digitals helps ecommerce brands build premium stores, improve conversion, 
              and scale with clarity through strategic digital systems.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#39D97A] px-7 py-3.5 text-sm font-black text-[#06101F] shadow-[0_0_30px_rgba(57,217,122,0.2)] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                Start Your Growth Plan
                <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
              </Link>

              <Link
                href="/portfolio"
                className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-7 py-3.5 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
              >
                View Our Work
                <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {[
                { icon: 'analytics', label: 'Conversion Focused' },
                { icon: 'precision', label: 'Premium Design' },
                { icon: 'strategy', label: 'Growth Strategy' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D]/80 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white/60"
                >
                  <SvgIcon name={item.icon} size={12} color="#39D97A" />
                  {item.label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Device mockups with floating stats */}
          <div className="relative z-10 hidden lg:block">
            <div className="relative h-[520px] w-full perspective-1200">
              {/* Laptop mockup */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 40, rotateX: 10 }}
                animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-8 animate-float preserve-3d"
              >
                <DeviceMockup
                  image={laptopImage}
                  alt={laptopAlt}
                  type="laptop"
                />
              </motion.div>

              {/* Phone mockup */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, x: -30, y: 20 }}
                animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 top-24 animate-float-delayed"
              >
                <DeviceMockup
                  image={phoneImage}
                  alt={phoneAlt}
                  type="phone"
                />
              </motion.div>

              {/* Floating stat badges */}
              <FloatingStatBadge
                icon="portfolio"
                value="87+"
                label="Projects Delivered"
                className="right-4 top-0 animate-float-slow"
                delay={0}
              />
              <FloatingStatBadge
                icon="star"
                value="98%"
                label="Client Satisfaction"
                className="left-4 bottom-32 animate-float-delayed"
                delay={0.15}
              />
              <FloatingStatBadge
                icon="ecommerce"
                value="35+"
                label="Stores Improved"
                className="right-8 bottom-8 animate-float"
                delay={0.3}
              />
            </div>
          </div>

          {/* Mobile: Simple image grid fallback */}
          <div className="relative z-10 grid grid-cols-2 gap-4 lg:hidden">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#1E314A] bg-[#0E1B2D]"
            >
              <img
                src={laptopImage}
                alt={laptopAlt}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </motion.div>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#1E314A] bg-[#0E1B2D]"
            >
              <img
                src={phoneImage}
                alt={phoneAlt}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </motion.div>

            {/* Mobile floating stats */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="col-span-2 flex flex-wrap items-center justify-center gap-3"
            >
              {[
                { icon: 'portfolio', value: '87+', label: 'Projects' },
                { icon: 'star', value: '98%', label: 'Satisfaction' },
                { icon: 'ecommerce', value: '35+', label: 'Stores' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2.5 rounded-xl border border-[#1E314A] bg-[#0E1B2D]/90 px-4 py-2.5 backdrop-blur-xl"
                >
                  <SvgIcon name={stat.icon} size={16} color="#39D97A" />
                  <div>
                    <span className="text-sm font-black text-white">{stat.value}</span>
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">
                      {stat.label}
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07111F] to-transparent pointer-events-none" />
    </section>
  )
}