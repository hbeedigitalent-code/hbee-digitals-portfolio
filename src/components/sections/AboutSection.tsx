'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { AboutData } from '@/types'
import SvgIcon from '@/components/ui/SvgIcon'

interface AboutSectionProps {
  data: AboutData
  compact?: boolean
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
    web: 'web',
    website: 'web',
    design: 'design',
    branding: 'design',
    ecommerce: 'ecommerce',
    shopify: 'ecommerce',
    marketing: 'marketing',
    strategy: 'services',
    consulting: 'consulting',
    growth: 'analytics',
  }

  return aliases[cleaned] || cleaned || 'services'
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
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
    </span>
  )
}

export default function AboutSection({ data, compact = false }: AboutSectionProps) {
  const reducedMotion = useReducedMotion()

  const {
    title = 'About Hbee Digitals',
    subtitle = 'A digital growth studio helping ambitious brands build better websites, stronger stores, and more trusted online experiences.',
    description = 'Hbee Digitals helps businesses turn their digital presence into a clearer, stronger, and more conversion-focused system. We combine strategy, design, development, ecommerce thinking, and support to create websites and online experiences that feel premium and work with purpose.',
    imageUrl,
    stats = [],
    values = [],
  } = data || {}

  return (
    <section
      className={`relative overflow-hidden bg-[#060E1C] text-white ${
        compact ? 'py-14 sm:py-16' : 'py-16 sm:py-20 lg:py-24'
      }`}
      aria-labelledby="about-heading"
    >
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[#39D97A]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[420px] rounded-full bg-[#123F2B]/45 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:80px_80px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="services" size={14} color="#39D97A" />
              About The Studio
            </div>

            <h2
              id="about-heading"
              className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-5xl md:text-6xl"
            >
              {title}
              <br />
              <CurvedUnderlineText>Built for digital growth.</CurvedUnderlineText>
            </h2>
          </motion.div>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            viewport={{ once: true }}
            className="max-w-2xl text-sm leading-7 text-white/60 sm:text-base md:text-lg lg:justify-self-end"
          >
            {subtitle}
          </motion.p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.28)] transition duration-500 hover:border-[#39D97A]/25"
          >
            <div className="relative h-[340px] overflow-hidden rounded-[1.5rem] bg-[#071427] sm:h-[430px]">
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt="Hbee Digitals homepage mockup on desktop workspace"
                    fill
                    priority={false}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C]/78 via-[#060E1C]/10 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(57,217,122,0.18),transparent_35%)]" />
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#071427] to-[#0B1E38]">
                  <div className="text-center">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                      <SvgIcon name="services" size={44} color="#39D97A" />
                    </div>

                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#39D97A]">
                      Upload About Image
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-[#060E1C]/72 p-4 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                  Strategy • Design • Ecommerce • Growth
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-8"
          >
            <p className="text-base leading-8 text-white/68 md:text-lg">
              {description}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Search-first thinking', icon: 'search' },
                { label: 'Conversion-focused UX', icon: 'analytics' },
                { label: 'Premium execution', icon: 'precision' },
                { label: 'Long-term support', icon: 'support' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-[#071427]/72 p-4 transition hover:border-[#39D97A]/25 hover:bg-white/[0.055]"
                >
                  <SvgIcon name={item.icon} size={20} color="#39D97A" className="mb-3" />
                  <p className="text-sm font-bold text-white/70">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {stats.length > 0 && (
          <dl className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.slice(0, 4).map((stat: any, index: number) => (
              <motion.div
                key={index}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-5 text-center transition hover:border-[#39D97A]/25 hover:bg-white/[0.065]"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-3xl font-black tracking-[-0.04em] text-[#39D97A]">
                  {stat.number}
                </dd>
                <dd className="mt-1 text-sm font-semibold text-white/55">{stat.label}</dd>
              </motion.div>
            ))}
          </dl>
        )}

        {values.length > 0 && (
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {values.map((value: any, index: number) => (
              <motion.article
                key={index}
                initial={reducedMotion ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-2 hover:border-[#39D97A]/28 hover:bg-white/[0.065]"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10 transition group-hover:scale-105">
                  <SvgIcon name={cleanIconName(value.icon)} size={26} color="#39D97A" />
                </div>

                <h3 className="text-xl font-black tracking-[-0.03em] text-white">
                  {value.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/58">
                  {value.description}
                </p>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}