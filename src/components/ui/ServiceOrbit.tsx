'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface ServiceItem {
  id: string
  title: string
  description: string
  features?: string[]
  icon?: string
}

interface ServiceOrbitProps {
  services?: ServiceItem[]
  intervalMs?: number
  compact?: boolean
}

const serviceIconMap: Record<string, string> = {
  code: 'web-development',
  'web-development': 'web-development',
  'web development': 'web-development',

  ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  'e-commerce solutions': 'ecommerce',
  shopify: 'ecommerce',

  design: 'ui-ux',
  'ui/ux': 'ui-ux',
  'ui-ux': 'ui-ux',
  'ui ux': 'ui-ux',

  branding: 'branding',
  brand: 'branding',
  marketing: 'digital-marketing',
  'digital-marketing': 'digital-marketing',
  'digital marketing': 'digital-marketing',

  consulting: 'consulting',
  strategy: 'consulting',
  performance: 'performance',
  security: 'security',
  services: 'services',
}

function getServiceIcon(service: ServiceItem) {
  const raw = String(service?.icon || service?.title || '')
    .toLowerCase()
    .trim()

  if (serviceIconMap[raw]) return serviceIconMap[raw]

  const normalized = raw
    .replace(/&/g, 'and')
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  return serviceIconMap[normalized] || normalized || 'services'
}

export default function ServiceOrbit({
  services = [],
  intervalMs = 5200,
  compact = false,
}: ServiceOrbitProps) {
  const reducedMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const displayServices = useMemo(() => {
    return services.length > 0
      ? services.slice(0, 5)
      : [
          {
            id: 'shopify-growth',
            title: 'Shopify Growth Systems',
            description:
              'Improve store structure, trust signals, conversion flow, and customer journey.',
            icon: 'ecommerce',
            features: ['Store audit', 'Conversion UX', 'Trust optimization', 'Checkout flow'],
          },
          {
            id: 'brand-experience',
            title: 'Brand Experience Design',
            description:
              'Create premium identities and interfaces that make businesses look credible.',
            icon: 'branding',
            features: ['Visual direction', 'UI systems', 'Landing pages', 'Brand consistency'],
          },
          {
            id: 'technical-systems',
            title: 'Technical Web Systems',
            description:
              'Build clean, scalable, responsive websites with modern frontend architecture.',
            icon: 'web-development',
            features: ['Next.js builds', 'Responsive UI', 'Performance', 'CMS structure'],
          },
        ]
  }, [services])

  const activeService = displayServices[activeIndex]
  const activeIcon = getServiceIcon(activeService)

  useEffect(() => {
    if (reducedMotion || isPaused || displayServices.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % displayServices.length)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [displayServices.length, intervalMs, isPaused, reducedMotion])

  if (!displayServices.length) return null

  return (
    <section
      className={`relative overflow-hidden text-white ${compact ? 'py-0' : 'py-12 sm:py-16'}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/48">
                <SvgIcon name="rocket" size={15} color="#39D97A" />
                Systems
              </div>

              <button
                type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#071427]/80 px-3 py-1.5 text-[11px] font-bold text-white/55 transition hover:border-[#39D97A]/25 hover:text-white"
              >
                <SvgIcon name={isPaused ? 'play' : 'pause'} size={12} color="#39D97A" />
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>

            <div className="grid gap-3">
              {displayServices.map((service, index) => {
                const icon = getServiceIcon(service)
                const active = index === activeIndex

                return (
                  <button
                    key={service.id || service.title}
                    type="button"
                    onClick={() => {
                      setActiveIndex(index)
                      setIsPaused(true)
                    }}
                    className={`group w-full overflow-hidden rounded-2xl border p-4 text-left transition duration-300 ${
                      active
                        ? 'border-[#39D97A]/35 bg-[#39D97A]/10 shadow-[0_0_35px_rgba(57,217,122,0.1)]'
                        : 'border-white/10 bg-[#071427]/70 hover:border-[#39D97A]/25 hover:bg-white/[0.055]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border transition ${
                          active
                            ? 'border-[#39D97A]/30 bg-[#39D97A]/14'
                            : 'border-white/10 bg-white/[0.045]'
                        }`}
                      >
                        <SvgIcon
                          name={icon}
                          size={21}
                          color={active ? '#39D97A' : 'rgba(248,250,252,0.55)'}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3
                          className={`text-sm font-black leading-tight tracking-[-0.02em] transition sm:text-base ${
                            active ? 'text-white' : 'text-white/72 group-hover:text-white'
                          }`}
                        >
                          {service.title}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/42">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    {active && (
                      <motion.div
                        key={`${activeIndex}-${isPaused}`}
                        className="mt-4 h-1 rounded-full bg-[#39D97A]"
                        initial={{ width: isPaused || reducedMotion ? '64%' : '0%' }}
                        animate={{ width: isPaused || reducedMotion ? '64%' : '100%' }}
                        transition={{
                          duration: isPaused || reducedMotion ? 0 : intervalMs / 1000,
                          ease: 'linear',
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeService.id || activeIndex}
              initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -14, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#071427] p-5 shadow-[0_35px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6 lg:p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.14),transparent_40%)]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/45 to-transparent" />

              <div className="relative">
                <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#39D97A]/20 bg-[#39D97A]/10 shadow-[0_0_35px_rgba(57,217,122,0.12)]">
                    <SvgIcon name={activeIcon} size={32} color="#39D97A" />
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#39D97A]/18 bg-white/[0.045] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#39D97A]">
                    System {activeIndex + 1}/{displayServices.length}
                  </div>
                </div>

                <h3 className="max-w-3xl text-3xl font-black leading-[1] tracking-[-0.04em] sm:text-4xl lg:text-5xl">
                  {activeService.title}
                </h3>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base md:text-lg">
                  {activeService.description}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {(activeService.features?.length
                    ? activeService.features.slice(0, 6)
                    : ['Strategic planning', 'Premium execution', 'Performance structure', 'Growth support']
                  ).map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8"
                    >
                      <SvgIcon name="precision" size={18} color="#39D97A" className="mb-3" />
                      <p className="text-sm font-bold leading-6 text-white/76">{feature}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/services"
                    className="group inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                  >
                    Explore Services
                    <SvgIcon
                      name="arrow-diagonal"
                      size={16}
                      color="#06101F"
                      className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-6 py-3 text-sm font-bold text-white/82 transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 hover:text-white"
                  >
                    Request Strategy Call
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}