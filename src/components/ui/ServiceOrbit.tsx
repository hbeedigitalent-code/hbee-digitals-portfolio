'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface Service {
  id?: string
  title?: string
  name?: string
  slug?: string
  icon?: string
  description?: string
  short_description?: string
  features?: string[] | string
}

interface ServiceOrbitProps {
  services?: Service[]
  intervalMs?: number
}

const fallbackServices: Service[] = [
  {
    title: 'Web Development',
    slug: 'web-development',
    icon: 'web-development',
    description: 'Premium websites built for trust, clarity, and conversion.',
    features: ['Premium UI', 'Mobile-first', 'Conversion flow'],
  },
  {
    title: 'UI/UX Design',
    slug: 'ui-ux-design',
    icon: 'ui-ux',
    description: 'Clean experiences designed around usability, trust, and action.',
    features: ['User journey', 'Mobile UX', 'Clear hierarchy'],
  },
  {
    title: 'Brand Strategy',
    slug: 'brand-strategy',
    icon: 'branding',
    description: 'Brand systems that improve perception, clarity, and consistency.',
    features: ['Positioning', 'Visual direction', 'Brand trust'],
  },
  {
    title: 'Digital Marketing',
    slug: 'digital-marketing',
    icon: 'digital-marketing',
    description: 'Growth-focused marketing systems for visibility and conversion.',
    features: ['Traffic strategy', 'Lead flow', 'Campaign structure'],
  },
  {
    title: 'E-Commerce Solutions',
    slug: 'ecommerce-solutions',
    icon: 'ecommerce',
    description: 'Store systems for Shopify, products, trust, and growth.',
    features: ['Shopify setup', 'Product structure', 'Checkout trust'],
  },
]

function normalizeArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function cleanIcon(icon?: string, title?: string) {
  const source = icon || title || 'services'

  const cleaned = source
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  if (cleaned.includes('ecommerce') || cleaned.includes('e-commerce')) return 'ecommerce'
  if (cleaned.includes('commerce')) return 'ecommerce'
  if (cleaned.includes('shopify')) return 'ecommerce'
  if (cleaned.includes('store')) return 'ecommerce'

  if (cleaned.includes('ui') || cleaned.includes('ux')) return 'ui-ux'
  if (cleaned.includes('marketing')) return 'digital-marketing'
  if (cleaned.includes('brand')) return 'branding'
  if (cleaned.includes('strategy')) return 'strategy'
  if (cleaned.includes('consult')) return 'consulting'
  if (cleaned.includes('web') || cleaned.includes('site')) return 'web-development'

  return cleaned || 'services'
}

function createSlug(service: Service) {
  const base = service.slug || service.title || service.name || ''

  return base
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function ServiceOrbit({
  services = fallbackServices,
  intervalMs = 5000,
}: ServiceOrbitProps) {
  const reducedMotion = useReducedMotion()
  const normalizedServices = services?.length ? services : fallbackServices
  const [activeIndex, setActiveIndex] = useState(0)

  const activeService = normalizedServices[activeIndex] || normalizedServices[0]

  const activeFeatures = useMemo(() => {
    return normalizeArray(activeService?.features).slice(0, 4)
  }, [activeService])

  const serviceTitle = activeService?.title || activeService?.name || 'Growth System'
  const serviceSlug = createSlug(activeService)
  const activeIcon = cleanIcon(activeService?.icon, serviceTitle)

  useEffect(() => {
    if (reducedMotion || normalizedServices.length <= 1) return

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % normalizedServices.length)
    }, intervalMs)

    return () => window.clearInterval(interval)
  }, [intervalMs, normalizedServices.length, reducedMotion])

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#07111F] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-7 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_42%)]" />

      <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A] sm:text-[11px]">
            <SvgIcon name="services" size={14} color="#39D97A" />
            Growth Services
          </div>

          <h2 className="text-3xl font-black leading-[0.98] tracking-[-0.055em] sm:text-4xl md:text-5xl">
            Services built as <GradientHeading>growth systems.</GradientHeading>
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
            Explore the core systems we use to help brands improve trust, clarity,
            performance, and conversions.
          </p>

          <div className="mt-7 hidden gap-3 lg:flex">
            {normalizedServices.map((service, index) => {
              const active = index === activeIndex

              return (
                <button
                  key={service.id || service.slug || service.title || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    active ? 'w-10 bg-[#39D97A]' : 'w-2.5 bg-white/18 hover:bg-white/35'
                  }`}
                  aria-label={`Show ${service.title || service.name}`}
                />
              )
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <motion.article
            key={activeService?.id || activeService?.slug || activeIndex}
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[1.7rem] border border-[#1E314A] bg-[#0B1728]/90 p-5 sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10">
                <SvgIcon name={activeIcon} size={22} color="#39D97A" />
              </div>

              <span className="rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]">
                System {activeIndex + 1}/{normalizedServices.length}
              </span>
            </div>

            <h3 className="text-3xl font-black leading-[1] tracking-[-0.05em] text-white sm:text-4xl">
              {serviceTitle}
            </h3>

            <p className="mt-4 text-sm leading-7 text-white/58 sm:text-base">
              {activeService?.description ||
                activeService?.short_description ||
                'A focused digital growth system designed to improve trust, clarity, and conversion.'}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(activeFeatures.length
                ? activeFeatures
                : ['Strategy', 'Execution', 'Optimization', 'Support']
              ).map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                    <SvgIcon name="verified" size={13} color="#39D97A" />
                  </div>

                  <span className="text-sm font-bold text-white/72">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href={serviceSlug ? `/services/${serviceSlug}` : '/services'}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                Explore Service
                <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
              </Link>

              <Link
                href="/contact"
                className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] px-6 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
              >
                Discuss Project
              </Link>
            </div>
          </motion.article>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {normalizedServices.map((service, index) => {
              const active = index === activeIndex

              return (
                <button
                  key={service.id || service.slug || service.title || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                    active
                      ? 'border-[#39D97A]/24 bg-[#39D97A]/10 text-[#39D97A]'
                      : 'border-[#1E314A] bg-[#07111F] text-white/52'
                  }`}
                >
                  {service.title || service.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}