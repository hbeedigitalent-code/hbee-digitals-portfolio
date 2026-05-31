'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface PortfolioItem {
  id: string
  title?: string
  name?: string
  client_name?: string
  slug?: string
  category?: string
  industry?: string
  project_type?: string
  description?: string
  image_url?: string
  featured_image?: string
  metric_value?: string
  metric_label?: string
  is_before_after?: boolean
}

function getTitle(item: PortfolioItem) {
  return item.client_name || item.title || item.name || 'Portfolio Project'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
}

function getCategory(item: PortfolioItem) {
  return item.category || item.industry || 'Case Study'
}

function getMetric(item: PortfolioItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }

  return item.metric_value || 'Growth'
}

function getHref(item: PortfolioItem) {
  return item.slug ? `/portfolio/${item.slug}` : '/portfolio'
}

function getWrappedIndex(index: number, length: number) {
  return ((index % length) + length) % length
}

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  const reducedMotion = useReducedMotion()
  const portfolioItems = useMemo(() => items.filter(Boolean), [items])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (reducedMotion || portfolioItems.length <= 1) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => getWrappedIndex(prev + 1, portfolioItems.length))
    }, 6500)

    return () => clearInterval(timer)
  }, [portfolioItems.length, reducedMotion])

  if (!portfolioItems.length) {
    return (
      <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-10 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="portfolio" size={14} color="#39D97A" />
              Featured Work
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
              Systems we built for <GradientHeading>growth.</GradientHeading>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
              Featured portfolio items will appear here once active projects are
              added from the admin dashboard.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 shadow-[0_28px_100px_rgba(0,0,0,0.24)]">
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[1.5rem] border border-[#1E314A] bg-[#07111F] px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                <SvgIcon name="portfolio" size={30} color="#39D97A" />
              </div>

              <h3 className="text-2xl font-black tracking-[-0.04em] text-white">
                Portfolio coming soon
              </h3>

              <p className="mt-3 max-w-md text-sm leading-7 text-white/58">
                Add active portfolio projects in admin to populate this section
                with case studies, metrics, and project images.
              </p>

              <Link
                href="/portfolio"
                className="mt-6 inline-flex min-h-[50px] items-center justify-center rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                View Portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const visibleCards = [-2, -1, 0, 1, 2]
    .map((offset) => {
      const index = getWrappedIndex(activeIndex + offset, portfolioItems.length)
      return {
        item: portfolioItems[index],
        index,
        offset,
      }
    })
    .filter((card, position, array) => {
      return array.findIndex((item) => item.index === card.index) === position
    })

  function goNext() {
    setActiveIndex((prev) => getWrappedIndex(prev + 1, portfolioItems.length))
  }

  function goPrev() {
    setActiveIndex((prev) => getWrappedIndex(prev - 1, portfolioItems.length))
  }

  return (
    <section className="relative overflow-hidden bg-[#07111F] py-16 text-white lg:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-[#39D97A]/5 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true }}
          className="max-w-4xl"
        >
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="portfolio" size={14} color="#39D97A" />
            Featured Work
          </p>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Systems we built for <GradientHeading>growth.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
            Real brands. Real results. Explore selected ecommerce builds,
            redesigns, and conversion-focused systems designed to improve
            performance and trust.
          </p>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto mt-10 h-[620px] max-w-7xl px-5 sm:h-[650px] sm:px-6 md:px-10 lg:mt-14 lg:h-[620px] lg:px-12">
        <div className="relative h-full">
          {visibleCards.map(({ item, index, offset }) => {
            const isActive = offset === 0

            const desktopPosition =
              offset === -2
                ? 'lg:left-[0%] lg:top-[120px] lg:w-[230px] lg:scale-[0.78] lg:opacity-45 lg:blur-[1.5px]'
                : offset === -1
                ? 'lg:left-[13%] lg:top-[85px] lg:w-[310px] lg:scale-[0.9] lg:opacity-75'
                : offset === 0
                ? 'lg:left-1/2 lg:top-0 lg:w-[560px] lg:-translate-x-1/2 lg:scale-100 lg:opacity-100'
                : offset === 1
                ? 'lg:right-[13%] lg:top-[85px] lg:w-[310px] lg:scale-[0.9] lg:opacity-75'
                : 'lg:right-[0%] lg:top-[120px] lg:w-[230px] lg:scale-[0.78] lg:opacity-45 lg:blur-[1.5px]'

            const tabletPosition =
              offset === -1
                ? 'md:left-[2%] md:top-[100px] md:w-[310px] md:scale-[0.88] md:opacity-70'
                : offset === 0
                ? 'md:left-1/2 md:top-0 md:w-[520px] md:-translate-x-1/2 md:scale-100 md:opacity-100'
                : offset === 1
                ? 'md:right-[2%] md:top-[100px] md:w-[310px] md:scale-[0.88] md:opacity-70'
                : 'md:hidden'

            const mobilePosition =
              offset === 0
                ? 'left-1/2 top-0 w-[88vw] -translate-x-1/2 opacity-100'
                : offset === 1
                ? 'left-[78%] top-[40px] w-[72vw] opacity-35'
                : offset === -1
                ? 'right-[78%] top-[40px] w-[72vw] opacity-35'
                : 'hidden'

            return (
              <motion.div
                key={`${item.id}-${index}-${offset}`}
                initial={reducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${mobilePosition} ${tabletPosition} ${desktopPosition} ${
                  isActive ? 'z-30' : 'z-10'
                }`}
              >
                <Link
                  href={getHref(item)}
                  className={`group block overflow-hidden rounded-[2rem] border bg-[#0E1B2D] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.28)] transition ${
                    isActive
                      ? 'border-[#39D97A]/35'
                      : 'border-[#1E314A] hover:border-[#39D97A]/20'
                  }`}
                >
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-[#07111F]">
                    {getImage(item) ? (
                      <img
                        src={getImage(item)}
                        alt={getTitle(item)}
                        loading={isActive ? 'eager' : 'lazy'}
                        className={`w-full object-cover transition duration-700 group-hover:scale-[1.04] ${
                          isActive
                            ? 'aspect-[4/4.6] sm:aspect-[16/10] lg:aspect-[16/9]'
                            : 'aspect-[4/5]'
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex items-center justify-center ${
                          isActive
                            ? 'aspect-[4/4.6] sm:aspect-[16/10] lg:aspect-[16/9]'
                            : 'aspect-[4/5]'
                        }`}
                      >
                        <SvgIcon name="portfolio" size={58} color="#39D97A" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/94 via-[#07111F]/20 to-transparent" />

                    <div className="absolute left-4 top-4 rounded-full bg-[#39D97A] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#06101F]">
                      {getMetric(item)}
                    </div>

                    {item.is_before_after && isActive && (
                      <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-[#07111F]/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-xl">
                        Before / After
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#39D97A]">
                        {getCategory(item)}
                      </p>

                      <h3
                        className={`mt-2 font-black tracking-[-0.04em] text-white ${
                          isActive ? 'text-2xl sm:text-4xl' : 'text-xl'
                        }`}
                      >
                        {getTitle(item)}
                      </h3>

                      {isActive && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/62 sm:text-sm sm:leading-6">
                          {item.project_type ||
                            item.description ||
                            'Premium digital system built for clearer trust and better growth.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className="flex items-center justify-between px-2 py-4">
                      <span className="inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                        View Case Study
                        <SvgIcon
                          name="arrow-diagonal"
                          size={14}
                          color="#39D97A"
                        />
                      </span>

                      <span className="text-xs font-bold text-white/35">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-10 flex max-w-7xl flex-col items-center gap-5 px-5 text-center sm:px-6 md:px-10 lg:px-12">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous portfolio item"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10"
          >
            <SvgIcon name="chevron-left" size={18} color="#39D97A" />
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next portfolio item"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10"
          >
            <SvgIcon name="chevron-right" size={18} color="#39D97A" />
          </button>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-white/55">
          {portfolioItems.length}+ successful projects across ecommerce, health,
          food, lifestyle, and digital growth systems.
        </p>

        <Link
          href="/portfolio"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
        >
          View All Work
        </Link>
      </div>
    </section>
  )
}
