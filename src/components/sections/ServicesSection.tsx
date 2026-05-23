'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface PortfolioItem {
  id: string
  title?: string
  name?: string
  slug?: string
  description?: string
  category?: string
  tag?: string
  image_url?: string
  featured_image?: string
  live_url?: string
  url?: string
  project_url?: string
  industry?: string
  results?: string[] | string
  technologies?: string[] | string
  is_featured?: boolean
}

interface Props {
  items: PortfolioItem[]
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

function getTitle(item: PortfolioItem) {
  return item.title || item.name || 'Project'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
}

function getSlug(item: PortfolioItem) {
  const base = item.slug || getTitle(item)

  return base
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function PortfolioSection({ items }: Props) {
  const reducedMotion = useReducedMotion()

  if (!items?.length) return null

  const orderedItems = [...items].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1
    if (!a.is_featured && b.is_featured) return 1
    return 0
  })

  return (
    <section className="relative overflow-hidden py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-10 h-[340px] w-[440px] rounded-full bg-[#39D97A]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[400px] rounded-full bg-[#C6F135]/6 blur-[120px]" />
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
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="portfolio" size={14} color="#39D97A" />
            Featured Work
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Case studies built for <GradientHeading>results.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
            Premium digital systems designed to improve trust, customer experience,
            visual positioning, and conversion performance.
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-2">
          {orderedItems.map((item, index) => {
            const title = getTitle(item)
            const image = getImage(item)
            const slug = getSlug(item)

            const results = normalizeArray(item.results).slice(0, 2)

            const technologies = normalizeArray(item.technologies).slice(0, 4)

            return (
              <motion.div
                key={item.id || index}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.42,
                  delay: index * 0.05,
                }}
                viewport={{ once: true }}
              >
                <Link
                  href={`/portfolio/${slug}`}
                  className={`group relative block overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] transition-all duration-300 hover:-translate-y-1 hover:border-[#39D97A]/25 hover:shadow-[0_30px_90px_rgba(0,0,0,0.28)] ${
                    index === 0
                      ? 'lg:col-span-2 lg:grid lg:grid-cols-[1.05fr_0.95fr]'
                      : ''
                  }`}
                >
                  <div className="relative overflow-hidden">
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className={`w-full object-cover transition duration-700 group-hover:scale-[1.03] ${
                          index === 0
                            ? 'aspect-[16/10] h-full'
                            : 'aspect-[4/3]'
                        }`}
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-[#07111F]">
                        <SvgIcon
                          name="portfolio"
                          size={50}
                          color="#39D97A"
                        />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/20 to-transparent" />

                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      {(item.category || item.tag) && (
                        <span className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A] backdrop-blur-sm">
                          {item.category || item.tag}
                        </span>
                      )}

                      {item.is_featured && (
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative flex flex-col justify-between p-6 sm:p-7">
                    <div>
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]">
                        Case Study
                      </div>

                      <h3 className="text-3xl font-black leading-[1] tracking-[-0.045em] text-white">
                        {title}
                      </h3>

                      <p className="mt-5 text-sm leading-7 text-white/60">
                        {item.description ||
                          'A premium digital project focused on trust, conversion, and customer experience improvement.'}
                      </p>

                      {results.length > 0 && (
                        <div className="mt-6 grid gap-3">
                          {results.map((result) => (
                            <div
                              key={result}
                              className="flex items-start gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F]/75 px-4 py-3"
                            >
                              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                                <SvgIcon
                                  name="verified"
                                  size={12}
                                  color="#39D97A"
                                />
                              </span>

                              <p className="text-sm leading-6 text-white/68">
                                {result}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {technologies.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          {technologies.map((tech) => (
                            <span
                              key={tech}
                              className="rounded-full border border-[#1E314A] bg-[#07111F] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/55"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                        View Case Study
                        <SvgIcon
                          name="arrow-diagonal"
                          size={15}
                          color="#39D97A"
                        />
                      </div>

                      {(item.live_url || item.url || item.project_url) && (
                        <div className="rounded-full border border-[#1E314A] bg-[#07111F] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                          Live Project
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/portfolio"
            className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-8 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
          >
            Explore Portfolio
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