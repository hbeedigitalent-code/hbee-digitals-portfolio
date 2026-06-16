'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AboutData } from '@/types'
import SvgIcon from '@/components/ui/SvgIcon'
import { supabase } from '@/lib/supabase'

interface AboutSectionProps {
  data: AboutData & Record<string, any>
  compact?: boolean
}

const ABOUT_BUCKET = 'project-images'

function isFullUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://')
}

function getPublicImageUrl(value?: string) {
  if (!value) return ''

  const cleaned = value.trim().replace(/^\/+/, '')

  if (!cleaned) return ''
  if (isFullUrl(cleaned)) return cleaned
  if (cleaned.includes('/storage/v1/object/public/')) return cleaned

  return supabase.storage.from(ABOUT_BUCKET).getPublicUrl(cleaned).data.publicUrl
}

function getAboutImage(data: AboutData & Record<string, any>) {
  const imageFields = [
    data.imageUrl,
    data.image_url,
    data.founder_image_url,
    data.founder_image,
    data.founder_photo_url,
    data.founder_photo,
    data.profile_image,
    data.image_path,
    data.image,
  ]

  for (const field of imageFields) {
    if (field && typeof field === 'string' && field.trim()) {
      const url = getPublicImageUrl(field)
      if (url) return url
    }
  }

  return ''
}

function cleanIconName(icon?: string) {
  if (!icon) return 'services'

  const cleaned = icon
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  const aliases: Record<string, string> = {
    web: 'web-development',
    website: 'web-development',
    design: 'branding',
    branding: 'branding',
    ecommerce: 'ecommerce',
    shopify: 'ecommerce',
    marketing: 'growth',
    strategy: 'strategy',
    consulting: 'consulting',
    growth: 'growth',
    support: 'support',
    precision: 'precision',
    analytics: 'analytics',
    search: 'search',
  }

  return aliases[cleaned] || cleaned || 'services'
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export default function AboutSection({ data, compact = false }: AboutSectionProps) {
  const reducedMotion = useReducedMotion()
  const [imageError, setImageError] = useState(false)

  const {
    title = 'About Hbee Digitals',
    subtitle = 'A digital growth studio helping ambitious brands build better websites, stronger stores, and more trusted online experiences.',
    description = 'Hbee Digitals helps businesses turn their digital presence into a clearer, stronger, and more conversion-focused system. We combine strategy, design, development, ecommerce thinking, and support to create websites and online experiences that feel premium and work with purpose.',
    stats = [],
    values = [],
  } = data || {}

  const imageSrc = getAboutImage(data || {})
  const imageTitle =
    data.founder_title ||
    data.image_title ||
    data.founder_name ||
    'Hbee Digitals Founder'

  const imageSubtitle =
    data.founder_role ||
    data.image_subtitle ||
    'Strategy • Design • Ecommerce • Growth'

  useEffect(() => {
    if (imageSrc) {
      console.log('AboutSection image URL:', imageSrc)
    }
  }, [imageSrc])

  return (
    <section
      className={`relative overflow-hidden bg-[var(--bg-section)] text-[var(--text-primary)] ${
        compact ? 'py-14 sm:py-16' : 'py-16 sm:py-20 lg:py-24'
      }`}
      aria-labelledby="about-heading"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[420px] rounded-full bg-[var(--accent-lime)]/6 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.015)_1px,transparent_1px)] bg-[size:80px_80px] opacity-15" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        {/* Header */}
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
          >
            <div className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              <SvgIcon name="services" size={14} color="var(--accent)" />
              About The Studio
            </div>

            <h2
              id="about-heading"
              className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl md:text-6xl"
            >
              {title}
              <br />
              <span className="text-[var(--accent)]">Built for digital growth.</span>
            </h2>
          </motion.div>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            viewport={{ once: true }}
            className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base md:text-lg lg:justify-self-end"
          >
            {subtitle}
          </motion.p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* Founder Image Card */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-md)] transition duration-500 hover:border-[var(--accent)]/25 hover:shadow-[var(--shadow-lg)]"
          >
            <div className="relative h-[340px] overflow-hidden rounded-[1.5rem] bg-[var(--bg-section)] sm:h-[430px]">
              {imageSrc && !imageError ? (
                <>
                  <Image
                    src={imageSrc}
                    alt={imageTitle}
                    fill
                    priority={false}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover object-top transition duration-700 group-hover:scale-[1.03]"
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/70 via-[var(--bg-page)]/10 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--accent)/0.12,transparent_35%)]" />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--bg-card)]">
                  <div className="text-center">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                      <SvgIcon name="services" size={44} color="var(--accent)" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                      {imageSrc ? 'Failed to load image' : 'Upload Founder Image'}
                    </p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {imageSrc ? 'Check file path in admin' : 'Go to Admin → About Section'}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-page)]/80 p-4 backdrop-blur-xl">
                <p className="text-sm font-black tracking-[-0.02em] text-[var(--text-primary)]">
                  {imageTitle}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  {imageSubtitle}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Description Card */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)] backdrop-blur-xl transition hover:shadow-[var(--shadow-lg)] sm:p-8"
          >
            <p className="text-base leading-8 text-[var(--text-secondary)] md:text-lg">
              {description}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Search-first thinking', icon: 'search' },
                { label: 'Conversion-focused UX', icon: 'analytics' },
                { label: 'Premium execution', icon: 'precision' },
                { label: 'Long-term support', icon: 'support' },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={reducedMotion ? false : { opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.05 }}
                  viewport={{ once: true }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg-page)] p-4 transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)]"
                >
                  <SvgIcon name={item.icon} size={20} color="var(--accent)" className="mb-3" />
                  <p className="text-sm font-bold text-[var(--text-secondary)]">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Stats Section - Staggered */}
        {stats && stats.length > 0 && (
          <motion.dl
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {stats.slice(0, 4).map((stat: any, index: number) => (
              <motion.div
                key={index}
                variants={itemVariants}
                custom={index}
                className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-card)] p-5 text-center transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-sm)]"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-3xl font-black tracking-[-0.04em] text-[var(--accent)]">
                  {stat.number || stat.value || '—'}
                </dd>
                <dd className="mt-1 text-sm font-semibold text-[var(--text-muted)]">
                  {stat.label}
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        )}

        {/* Values Section - Staggered Grid */}
        {values && values.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            {values.map((value: any, index: number) => (
              <motion.article
                key={index}
                variants={itemVariants}
                custom={index}
                className="group rounded-[1.6rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition duration-300 hover:-translate-y-2 hover:border-[var(--accent)]/28 hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-md)]"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 transition group-hover:scale-105">
                  <SvgIcon name={cleanIconName(value.icon)} size={26} color="var(--accent)" />
                </div>

                <h3 className="text-xl font-black tracking-[-0.03em] text-[var(--text-primary)]">
                  {value.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {value.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}