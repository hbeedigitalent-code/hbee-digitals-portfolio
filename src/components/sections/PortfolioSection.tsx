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
    <section className="relative overflow-hidden bg-[var(--bg-page)] py-16 text-[var(--text-primary)] sm:py-20 lg:py-24">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-10 h-[340px] w-[440px] rounded-full bg-[var(--accent)]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[400px] rounded-full bg-[var(--accent-lime)]/6 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        {/* Header */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          viewport={{ once: true }}
          className="mb-12 max-w-4xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            <SvgIcon name="portfolio" size={14} color="var(--accent)" />
            Featured Work
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
            Case studies built for <GradientHeading>results.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            Premium digital systems designed to improve trust, customer experience,
            visual positioning, and conversion performance.
          </p>
        </motion.div>

        {/* Portfolio Grid */}
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
                  className={`group relative block overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/25 hover:shadow-[var(--shadow-lg)] ${
                    index === 0
                      ? 'lg:col-span-2 lg:grid lg:grid-cols-[1.05fr_0.95fr]'
                      : ''
                  }`}
                >
                  {/* Image Section */}
                  <div className="relative overflow-hidden">
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className={`w-full object-cover transition duration-700 group-hover:scale-[1.03] ${
                          index === 0 ? 'aspect-[16/10] h-full' : 'aspect-[4/3]'
                        }`}
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-[var(--bg-section)]">
                        <SvgIcon name="portfolio" size={50} color="var(--accent)" />
                      </div>
                    )}

                    {/* Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/90 via-[var(--bg-page)]/20 to-transparent" />

                    {/* Badges */}
                    <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                      {(item.category || item.tag) && (
                        <span className="rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent)] backdrop-blur-sm">
                          {item.category || item.tag}
                        </span>
                      )}
                      {item.is_featured && (
                        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)]/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-primary)] backdrop-blur-sm">
                          Featured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="relative flex flex-col justify-between p-6 sm:p-7">
                    <div>
                      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/16 bg-[var(--accent)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent)]">
                        Case Study
                      </div>

                      <h3 className="text-3xl font-black leading-[1] tracking-[-0.045em] text-[var(--text-primary)]">
                        {title}
                      </h3>

                      <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
                        {item.description ||
                          'A premium digital project focused on trust, conversion, and customer experience improvement.'}
                      </p>

                      {/* Results */}
                      {results.length > 0 && (
                        <div className="mt-6 grid gap-3">
                          {results.map((result) => (
                            <div
                              key={result}
                              className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-section)]/75 px-4 py-3"
                            >
                              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/16 bg-[var(--accent)]/10">
                                <SvgIcon name="verified" size={12} color="var(--accent)" />
                              </span>
                              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                                {result}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Technologies */}
                      {technologies.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          {technologies.map((tech) => (
                            <span
                              key={tech}
                              className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-muted)]"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] transition group-hover:gap-3">
                        View Case Study
                        <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
                      </div>
                      {(item.live_url || item.url || item.project_url) && (
                        <div className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
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

        {/* View All Button */}
        <div className="mt-12 text-center">
          <Link
            href="/portfolio"
            className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-8 py-3 text-sm font-black text-[var(--text-primary)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)]"
          >
            Explore Portfolio
            <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
          </Link>
        </div>
      </div>
    </section>
  )
}