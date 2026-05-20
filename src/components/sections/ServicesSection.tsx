'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface Service {
  id: string
  title: string
  description: string
  features?: string[]
  icon?: string
}

interface ServicesSectionProps {
  data: Service[]
  title?: string
  subtitle?: string
}

export function getServiceIcon(service: Service) {
  const raw = String(service?.icon || service?.title || '')
    .toLowerCase()
    .trim()
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .replace(/\s+/g, '-')

  const map: Record<string, string> = {
    web: 'web',
    website: 'web',
    'web-development': 'web',
    'website-design': 'web',
    code: 'web',

    ecommerce: 'ecommerce',
    'e-commerce': 'ecommerce',
    shopify: 'ecommerce',
    store: 'ecommerce',

    design: 'design',
    'ui-ux': 'design',
    'ui/ux': 'design',
    branding: 'design',
    brand: 'design',

    marketing: 'marketing',
    'digital-marketing': 'marketing',
    ads: 'marketing',

    consulting: 'consulting',
    strategy: 'services',
    systems: 'services',
    services: 'services',

    security: 'security',
    performance: 'performance',
    analytics: 'analytics',
  }

  return map[raw] || 'services'
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 text-[#39D97A]">{children}</span>
      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M4 13C50 2 142 2 216 11" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export default function ServicesSection({
  data,
  title = 'Growth Systems We Build',
  subtitle = 'Strategic services designed to improve trust, conversion, performance, and long-term scalability.',
}: ServicesSectionProps) {
  const reducedMotion = useReducedMotion()

  if (!data || data.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[#060E1C] py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-24 h-[340px] w-[440px] rounded-full bg-[#39D97A]/7 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[440px] rounded-full bg-[#123F2B]/40 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="services" size={14} color="#39D97A" />
              What We Build
            </div>

            <h2 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.04em] sm:text-5xl md:text-6xl">
              {title.includes('Growth') ? (
                <>
                  Growth systems for
                  <br />
                  <CurvedUnderlineText>modern brands.</CurvedUnderlineText>
                </>
              ) : (
                title
              )}
            </h2>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-white/58 sm:text-base md:text-lg lg:justify-self-end">
            {subtitle}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((service, index) => {
            const icon = getServiceIcon(service)
            const featured = index === 0

            return (
              <motion.article
                key={service.id}
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: index * 0.045 }}
                viewport={{ once: true }}
                className={`group relative overflow-hidden rounded-[1.7rem] border p-6 shadow-[0_28px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:scale-[1.01] ${
                  featured
                    ? 'border-[#39D97A] bg-[#39D97A] text-[#06101F]'
                    : 'border-white/10 bg-white/[0.045] text-white hover:border-[#39D97A]/30 hover:bg-white/[0.065]'
                }`}
              >
                <div
                  className={`absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
                    featured ? 'bg-[#06101F]/10' : 'bg-[#39D97A]/10'
                  }`}
                />

                <div className="relative">
                  <div
                    className={`mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border transition duration-300 group-hover:scale-105 ${
                      featured
                        ? 'border-[#06101F]/12 bg-[#06101F]/10'
                        : 'border-[#39D97A]/18 bg-[#39D97A]/10'
                    }`}
                  >
                    <SvgIcon name={icon} size={32} color={featured ? '#06101F' : '#39D97A'} />
                  </div>

                  <h3 className="text-2xl font-black leading-tight tracking-[-0.035em]">
                    {service.title}
                  </h3>

                  <p className={`mt-4 text-sm leading-7 ${featured ? 'text-[#06101F]/72' : 'text-white/58'}`}>
                    {service.description}
                  </p>

                  {service.features && service.features.length > 0 && (
                    <ul className="mt-6 space-y-2.5">
                      {service.features.slice(0, 4).map((feature, i) => (
                        <li
                          key={i}
                          className={`flex items-center gap-2.5 text-sm font-semibold ${
                            featured ? 'text-[#06101F]/70' : 'text-white/62'
                          }`}
                        >
                          <SvgIcon name="precision" size={14} color={featured ? '#06101F' : '#39D97A'} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Link
                    href="/contact"
                    className={`mt-7 inline-flex items-center gap-2 text-sm font-black transition ${
                      featured ? 'text-[#06101F]' : 'text-[#39D97A] hover:text-[#C6F135]'
                    }`}
                  >
                    Start Project
                    <SvgIcon name="arrow-diagonal" size={15} color={featured ? '#06101F' : '#39D97A'} />
                  </Link>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}