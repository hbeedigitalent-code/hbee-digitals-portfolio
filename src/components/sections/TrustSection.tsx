'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface TrustStat {
  value: string
  label: string
  icon?: string
}

interface PartnerLogo {
  name: string
  logo?: string
}

interface TrustTestimonial {
  name: string
  role?: string
  quote: string
  rating?: number
  avatar?: string
}

interface TrustBadge {
  title: string
  description?: string
  icon?: string
}

interface TrustSectionData {
  badge?: string
  headline?: string
  highlighted_word?: string
  description?: string
  stats?: TrustStat[]
  partner_logos?: PartnerLogo[]
  testimonials?: TrustTestimonial[]
  trust_badges?: TrustBadge[]
  cta_text?: string
  cta_link?: string
}

export default function TrustSection({ data }: { data?: TrustSectionData }) {
  const reducedMotion = useReducedMotion()

  const badge = data?.badge || 'Trusted by merchants worldwide'
  const headline = data?.headline || 'Built on trust. Delivering results.'
  const highlightedWord = data?.highlighted_word || 'trust'
  const description =
    data?.description ||
    'We help ambitious brands grow with reliable systems, better user experiences, and conversion-focused digital strategy.'

  const stats = data?.stats || []
  const partnerLogos = data?.partner_logos || []
  const testimonials = data?.testimonials || []
  const trustBadges = data?.trust_badges || []

  const ctaText = data?.cta_text || 'Start Your Growth Review'
  const ctaLink = data?.cta_link || '/contact'

  const headingParts = headline.split(new RegExp(`(${highlightedWord})`, 'i'))

  return (
    <section className="relative overflow-hidden bg-[#050B16] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-0 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[#39D97A]/8 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[460px] rounded-full bg-[#C6F135]/7 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true }}
          className="mx-auto max-w-5xl text-center"
        >
          <p className="mx-auto mb-5 inline-flex rounded-full border border-[#39D97A]/24 bg-[#39D97A]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#B7FF2A]">
            {badge}
          </p>

          <h2 className="text-4xl font-black uppercase leading-[0.96] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {headingParts.map((part, index) =>
              part.toLowerCase() === highlightedWord.toLowerCase() ? (
                <span key={`${part}-${index}`} className="text-[#B7FF2A]">
                  {part}
                </span>
              ) : (
                <span key={`${part}-${index}`}>{part}</span>
              )
            )}
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-white/62 sm:text-base md:text-lg">
            {description}
          </p>
        </motion.div>

        {stats.length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={`${stat.label}-${index}`}
                initial={reducedMotion ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                viewport={{ once: true }}
                className="rounded-[1.6rem] border border-[#B7FF2A]/16 bg-white/[0.035] p-5 text-center backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#B7FF2A]/35 hover:bg-[#B7FF2A]/5"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#B7FF2A]/28 bg-[#B7FF2A]/10">
                  <SvgIcon name={stat.icon || 'verified'} size={24} color="#B7FF2A" />
                </div>

                <p className="text-4xl font-black tracking-[-0.05em] text-[#B7FF2A]">
                  {stat.value}
                </p>

                <p className="mt-2 text-sm font-semibold text-white/68">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {partnerLogos.length > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
            className="mt-10 rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl"
          >
            <div className="grid gap-6 lg:grid-cols-[0.35fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                  Trusted Partner Of
                </p>
                <p className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-[#B7FF2A]">
                  Growing Brands
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {partnerLogos.map((partner, index) => (
                  <div
                    key={`${partner.name}-${index}`}
                    className="flex min-h-[60px] items-center justify-center rounded-2xl border border-white/8 bg-[#07111F]/70 px-4"
                  >
                    {partner.logo ? (
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="max-h-8 max-w-[130px] object-contain brightness-0 invert"
                      />
                    ) : (
                      <span className="text-sm font-black uppercase tracking-[0.12em] text-white/70">
                        {partner.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {testimonials.length > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
            className="mt-6 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl md:p-6"
          >
            <div className="grid gap-5 lg:grid-cols-[0.28fr_1fr]">
              <div className="rounded-[1.4rem] border border-white/10 bg-[#07111F]/70 p-5">
                <p className="text-lg font-black uppercase leading-tight text-white">
                  What Clients
                </p>
                <p className="text-lg font-black uppercase leading-tight text-[#B7FF2A]">
                  Are Saying
                </p>

                <div className="mt-6 rounded-2xl border border-[#B7FF2A]/18 bg-[#B7FF2A]/10 p-4">
                  <p className="text-sm font-black text-white">★★★★★</p>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    Reviews collected from real client experiences and project feedback.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {testimonials.slice(0, 3).map((item, index) => (
                  <article
                    key={`${item.name}-${index}`}
                    className="rounded-[1.4rem] border border-white/10 bg-[#07111F]/70 p-5 transition hover:-translate-y-1 hover:border-[#B7FF2A]/28"
                  >
                    <p className="text-4xl font-black leading-none text-[#B7FF2A]">
                      “
                    </p>

                    <p className="mt-2 text-sm leading-7 text-white/76">
                      {item.quote}
                    </p>

                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#B7FF2A]/20 bg-[#B7FF2A]/10">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-black text-[#B7FF2A]">
                            {item.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-black text-white">{item.name}</p>
                        {item.role && (
                          <p className="mt-0.5 text-xs text-white/50">{item.role}</p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {trustBadges.length > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
            className="mt-8 rounded-[1.8rem] border border-[#B7FF2A]/24 bg-[#B7FF2A]/5 p-5 shadow-[0_0_80px_rgba(183,255,42,0.08)] md:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trustBadges.map((item, index) => (
                <div
                  key={`${item.title}-${index}`}
                  className="rounded-[1.3rem] border border-white/10 bg-[#07111F]/70 p-5"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#B7FF2A]/20 bg-[#B7FF2A]/10">
                    <SvgIcon name={item.icon || 'verified'} size={22} color="#B7FF2A" />
                  </div>

                  <h3 className="text-lg font-black uppercase leading-tight text-white">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-3 text-sm leading-7 text-white/58">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-5 border-t border-white/10 pt-6 text-center md:flex-row md:text-left">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
                  We stand by our work
                </p>
                <p className="mt-2 text-xl font-black uppercase tracking-[-0.03em] text-[#B7FF2A]">
                  No fluff. Just better systems.
                </p>
              </div>

              <Link
                href={ctaLink}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#B7FF2A] px-7 py-3 text-sm font-black text-[#07111F] transition hover:scale-[1.02]"
              >
                {ctaText}
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}