'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { FeaturedAboutData } from '@/types/featured-about'
import SvgIcon from '@/components/ui/SvgIcon'

// Animation variants
const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const headingVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const descriptionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.1,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      delay: 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  tap: {
    scale: 0.98,
  },
}

const imageVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      delay: 0.15,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const underlineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      delay: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

const floatVariants2 = {
  initial: { y: 0 },
  animate: {
    y: [0, 10, 0],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: 1,
    },
  },
}

// Fallback content
const fallbackData: FeaturedAboutData = {
  section_label: 'About Us',
  heading: 'About Hbee Digitals',
  highlighted_heading_text: 'Trusted Digital Growth Studio',
  description: `Hbee Digitals helps ecommerce brands, startups, and service-based businesses build stronger digital foundations through high-converting websites, brand strategy, automation, and growth-focused digital systems. We combine design, development, and marketing strategy to create online experiences that look professional, build trust, and support measurable business growth.`,
  cta_text: 'About Us',
  cta_url: '/about',
  logo_url: '/svgs/logo.svg',
  is_active: true,
  display_order: 0,
}

export default function FeaturedAboutSection() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const [data, setData] = useState<FeaturedAboutData>(fallbackData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: fetchedData, error } = await supabase
          .from('featured_about_section')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .single()

        if (!error && fetchedData) {
          setData(fetchedData as FeaturedAboutData)
        }
      } catch (err) {
        console.error('Error fetching featured about data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <section ref={sectionRef} className="relative overflow-hidden bg-[var(--bg-page)] py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <div className="h-8 w-32 animate-pulse rounded-full bg-[var(--bg-section)]" />
              <div className="h-12 w-3/4 animate-pulse rounded-lg bg-[var(--bg-section)]" />
              <div className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-[var(--bg-section)]" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--bg-section)]" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--bg-section)]" />
              </div>
              <div className="h-12 w-32 animate-pulse rounded-full bg-[var(--bg-section)]" />
            </div>
            <div className="h-[400px] w-full animate-pulse rounded-2xl bg-[var(--bg-section)]" />
          </div>
        </div>
      </section>
    )
  }

  if (!data.is_active) return null

  return (
    <motion.section
      ref={sectionRef}
      variants={sectionVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className="relative overflow-hidden bg-[var(--bg-page)] py-16 sm:py-20 lg:py-24"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-20 top-20 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/5 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-[300px] w-[380px] rounded-full bg-[var(--blue-500)]/5 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Left Column - Text Content */}
          <div>
            {/* Section Label */}
            <motion.div
              variants={headingVariants}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4"
            >
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                {data.section_label}
              </span>
            </motion.div>

            {/* Heading with animated underline */}
            <motion.div variants={headingVariants} className="relative">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-[1.1] tracking-[-0.02em] text-[var(--text-primary)]">
                {data.heading}
                <br />
                <span className="text-[var(--accent)] relative inline-block">
                  {data.highlighted_heading_text}
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 20"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <motion.path
                      d="M5 15 C50 5, 100 18, 150 12 C200 6, 250 16, 295 10"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      variants={underlineVariants}
                      initial="hidden"
                      animate={isInView ? 'visible' : 'hidden'}
                    />
                  </svg>
                </span>
              </h2>
            </motion.div>

            {/* Description */}
            <motion.p
              variants={descriptionVariants}
              className="mt-6 text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8"
            >
              {data.description}
            </motion.p>

            {/* CTA Button */}
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="mt-8"
            >
              <Link
                href={data.cta_url}
                className="btn-primary inline-flex items-center gap-2"
              >
                {data.cta_text}
                <SvgIcon name="arrow-right" size={14} color="white" />
              </Link>
            </motion.div>
          </div>

          {/* Right Column - Image Card */}
          <motion.div
            variants={imageVariants}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-2xl shadow-[var(--shadow-xl)]">
              {/* Main Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-navy)]">
                {data.image_url ? (
                  <Image
                    src={data.image_url}
                    alt={data.heading}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  // Fallback image placeholder
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--bg-navy)] to-[var(--bg-navy-mid)]">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
                        <SvgIcon name="services" size={40} color="var(--accent)" />
                      </div>
                      <p className="text-sm text-[var(--text-muted)]">Upload image in admin panel</p>
                    </div>
                  </div>
                )}

                {/* Deep Navy Curved Overlay on Left */}
                <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[var(--bg-navy)] via-[var(--bg-navy)]/90 to-transparent" />
                
                {/* Blue Gradient Glow Accent */}
                <motion.div
                  variants={floatVariants}
                  initial="initial"
                  animate="animate"
                  className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[var(--blue-500)]/20 blur-3xl"
                />

                {/* Orange Gradient Circle Accent */}
                <motion.div
                  variants={floatVariants2}
                  initial="initial"
                  animate="animate"
                  className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-[var(--accent)]/15 blur-2xl"
                />

                {/* Logo/Brand Mark inside overlay */}
                <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 rounded-xl bg-[var(--bg-navy)]/80 backdrop-blur-md p-3 border border-white/10">
                  <img
                    src={data.logo_url || '/svgs/logo.svg'}
                    alt="Hbee Digitals"
                    className="h-8 w-8 object-contain"
                  />
                  <span className="text-xs font-bold text-white">Hbee Digitals</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}