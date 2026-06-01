'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface ServiceItem {
  id: string
  title: string
  slug?: string
  description?: string
  short_description?: string
  icon?: string
  timeline?: string
  starting_price?: string
}

interface ServiceSectionProps {
  services: ServiceItem[]
  title?: string
  subtitle?: string
  limit?: number
}

function cleanIcon(icon?: string, title?: string) {
  const source = icon || title || 'services'

  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  if (cleaned.includes('ecommerce') || cleaned.includes('commerce') || cleaned.includes('shopify')) return 'ecommerce'
  if (cleaned.includes('ui') || cleaned.includes('ux')) return 'ui-ux'
  if (cleaned.includes('marketing')) return 'digital-marketing'
  if (cleaned.includes('brand')) return 'branding'
  if (cleaned.includes('web') || cleaned.includes('site')) return 'web-development'
  if (cleaned.includes('consult')) return 'consulting'

  return cleaned || 'services'
}

export default function ServiceSection({ 
  services, 
  title = "Services we offer", 
  subtitle = "Premium digital growth systems designed to improve trust, conversion, and long-term performance.",
  limit = 6 
}: ServiceSectionProps) {
  const reducedMotion = useReducedMotion()
  
  if (!services?.length) return null

  const displayServices = services.slice(0, limit)

  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] py-16 text-[var(--text-primary)] sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[var(--accent-lime)]/6 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          viewport={{ once: true }}
          className="mb-12 max-w-4xl"
        >
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            <SvgIcon name="services" size={14} color="var(--accent)" />
            What We Do
          </p>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
            {title} <GradientHeading>premium execution.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            {subtitle}
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {displayServices.map((service, index) => {
            const icon = cleanIcon(service.icon, service.title)

            return (
              <motion.div
                key={service.id}
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Link
                  href={service.slug ? `/services/${service.slug}` : '/services'}
                  className="group block h-full rounded-[1.8rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/25 hover:shadow-[var(--shadow-md)]"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 transition group-hover:scale-105">
                    <SvgIcon name={icon} size={26} color="var(--accent)" />
                  </div>

                  <h3 className="text-xl font-black leading-tight tracking-[-0.03em] text-[var(--text-primary)]">
                    {service.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {service.short_description || service.description || 'A premium digital growth system designed for performance.'}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] transition group-hover:gap-3">
                      Learn More
                      <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
                    </div>

                    {(service.timeline || service.starting_price) && (
                      <div className="flex gap-2">
                        {service.timeline && (
                          <span className="rounded-full border border-[var(--accent)]/16 bg-[var(--accent)]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--accent)]">
                            {service.timeline}
                          </span>
                        )}
                        {service.starting_price && (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]">
                            {service.starting_price}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* View All Services Link */}
        {services.length > limit && (
          <div className="mt-12 text-center">
            <Link
              href="/services"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-8 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)]"
            >
              View All Services
              <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}