'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface Service {
  id: string
  title?: string
  slug?: string
  description?: string
  short_description?: string
  full_description?: string
  icon?: string
  features?: string[] | string
  benefits?: string[] | string
  timeline?: string
  starting_price?: string
  is_featured?: boolean
  display_order?: number
}

interface Props {
  services: Service[]
}

function normalizeArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function cleanIcon(service: Service) {
  const source = service.icon || service.title || 'services'

  const cleaned = source
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  if (
    cleaned.includes('ecommerce') ||
    cleaned.includes('commerce') ||
    cleaned.includes('shopify')
  ) {
    return 'ecommerce'
  }

  if (cleaned.includes('ui') || cleaned.includes('ux')) {
    return 'ui-ux'
  }

  if (cleaned.includes('marketing')) {
    return 'digital-marketing'
  }

  if (cleaned.includes('brand')) {
    return 'branding'
  }

  if (cleaned.includes('web') || cleaned.includes('site')) {
    return 'web-development'
  }

  if (cleaned.includes('consult')) {
    return 'consulting'
  }

  return cleaned || 'services'
}

function createSlug(service: Service) {
  const base = service.slug || service.title || ''

  return base
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function ServicesSection({ services }: Props) {
  const reducedMotion = useReducedMotion()

  const orderedServices = [...services].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1

    return (a.display_order || 0) - (b.display_order || 0)
  })

  if (!orderedServices.length) return null

  return (
    <section className="relative overflow-hidden py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[#39D97A]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[#C6F135]/6 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true }}
          className="mb-12 max-w-4xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="services" size={14} color="#39D97A" />
            Premium Digital Services
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Digital systems built for <GradientHeading>trust & growth.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
            From ecommerce optimization to premium websites and brand systems,
            we help businesses improve how they present, convert, and scale online.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {orderedServices.map((service, index) => {
            const icon = cleanIcon(service)

            const slug = createSlug(service)

            const features = normalizeArray(service.features).slice(0, 3)

            const benefits = normalizeArray(service.benefits).slice(0, 3)

            const items =
              features.length > 0
                ? features
                : benefits.length > 0
                  ? benefits
                  : ['Strategy', 'Optimization', 'Growth']

            return (
              <motion.div
                key={service.id || index}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.42,
                  delay: index * 0.05,
                }}
                viewport={{ once: true }}
              >
                <Link
                  href={`/services/${slug}`}
                  className={`group relative block overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#39D97A]/25 hover:shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-6 ${
                    index === 0
                      ? 'md:col-span-2 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:gap-8'
                      : ''
                  }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_42%)] opacity-70" />

                  <div className="relative">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-[#39D97A]/18 bg-[#39D97A]/10">
                      <SvgIcon
                        name={icon}
                        size={25}
                        color="#39D97A"
                      />
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                        Service {String(index + 1).padStart(2, '0')}
                      </p>

                      {service.is_featured && (
                        <span className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]">
                          Featured
                        </span>
                      )}
                    </div>

                    <h3 className="text-3xl font-black leading-[1] tracking-[-0.045em] text-white sm:text-4xl">
                      {service.title}
                    </h3>

                    <p className="mt-5 text-sm leading-7 text-white/60 sm:text-base">
                      {service.short_description ||
                        service.description ||
                        'A premium digital service focused on trust, usability, and conversion growth.'}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {service.timeline && (
                        <span className="rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]">
                          {service.timeline}
                        </span>
                      )}

                      {service.starting_price && (
                        <span className="rounded-full border border-[#1E314A] bg-[#07111F] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/55">
                          {service.starting_price}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative mt-7 grid gap-3 lg:mt-0">
                    {items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F]/80 px-4 py-3"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                          <SvgIcon
                            name="verified"
                            size={13}
                            color="#39D97A"
                          />
                        </span>

                        <span className="text-sm font-bold text-white/68">
                          {item}
                        </span>
                      </div>
                    ))}

                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                      Explore Service
                      <SvgIcon
                        name="arrow-diagonal"
                        size={15}
                        color="#39D97A"
                      />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/services"
            className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-8 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
          >
            View All Services
            <SvgIcon
              name="arrow-diagonal"
              size={15}
              color="#39D97A"
            />
          </Link>
        </div>
      </div>
    </section>
  )
}