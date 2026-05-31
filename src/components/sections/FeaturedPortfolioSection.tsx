'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, type PanInfo, useReducedMotion } from 'framer-motion'
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
  before_image?: string
  after_image?: string
  is_before_after?: boolean
}

function getTitle(item: PortfolioItem) {
  return item.client_name || item.title || item.name || 'Portfolio Project'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || item.after_image || item.before_image || ''
}

function getCategory(item: PortfolioItem) {
  return item.category || item.industry || item.project_type || 'Case Study'
}

function getMetric(item: PortfolioItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }

  return item.metric_value || 'Growth System'
}

function getDescription(item: PortfolioItem) {
  return (
    item.description ||
    item.project_type ||
    'Premium digital system built for clearer trust, better presentation, and stronger conversion flow.'
  )
}

function getHref(item: PortfolioItem) {
  return item.slug ? `/portfolio/${item.slug}` : '/portfolio'
}

function getWrappedIndex(index: number, length: number) {
  return ((index % length) + length) % length
}

const cardSlots = [-2, -1, 0, 1, 2]

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  const reducedMotion = useReducedMotion()
  const portfolioItems = useMemo(() => items.filter(Boolean), [items])
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback(
    (index: number) => {
      if (!portfolioItems.length) return
      setActiveIndex(getWrappedIndex(index, portfolioItems.length))
    },
    [portfolioItems.length]
  )

  const goNext = useCallback(() => {
    goTo(activeIndex + 1)
  }, [activeIndex, goTo])

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1)
  }, [activeIndex, goTo])

  useEffect(() => {
    if (activeIndex <= portfolioItems.length - 1) return
    setActiveIndex(0)
  }, [activeIndex, portfolioItems.length])

  useEffect(() => {
    if (reducedMotion || portfolioItems.length <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => getWrappedIndex(prev + 1, portfolioItems.length))
    }, 6200)

    return () => window.clearInterval(timer)
  }, [portfolioItems.length, reducedMotion])

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (Math.abs(info.offset.x) < 56) return
    if (info.offset.x < 0) {
      goNext()
    } else {
      goPrev()
    }
  }

  if (!portfolioItems.length) {
    return (
      <section className="relative overflow-hidden bg-[#07111F] px-5 py-20 text-white sm:px-6 md:px-10 lg:px-12 lg:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-8 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[#39D97A]/14 blur-[150px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-[#C6F135]/10 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/35 bg-[#39D97A]/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="portfolio" size={14} color="#39D97A" />
              Featured Portfolio
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl">
              Signature work will live <GradientHeading>right here.</GradientHeading>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/72">
              Featured projects will appear here once active portfolio items are
              added from the admin dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/portfolio"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                View Portfolio
              </Link>

              <Link
                href="/admin/portfolio"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-7 py-3 text-sm font-black text-[#39D97A] transition hover:bg-[#39D97A]/15"
              >
                Manage Projects
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#39D97A]/35 bg-[#0E1B2D] p-4 shadow-[0_28px_100px_rgba(57,217,122,0.16)]">
            <div className="grid min-h-[360px] place-items-center rounded-[1.5rem] border border-[#39D97A]/20 bg-[#07111F] px-6 text-center">
              <div>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#39D97A]/30 bg-[#39D97A]/15">
                  <SvgIcon name="portfolio" size={38} color="#39D97A" />
                </div>

                <h3 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                  No active projects yet
                </h3>

                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/64 sm:text-base">
                  The showcase is ready. Add active portfolio items in admin and
                  this fallback will be replaced automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const activeItem = portfolioItems[activeIndex] || portfolioItems[0]
  const visibleCards = cardSlots
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

  return (
    <section
      className="relative overflow-hidden bg-[#07111F] py-16 text-white lg:py-24"
      aria-labelledby="featured-portfolio-heading"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[150px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-[#C6F135]/7 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-24" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            viewport={{ once: true }}
          >
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="portfolio" size={14} color="#39D97A" />
              Featured Portfolio
            </p>

            <h2
              id="featured-portfolio-heading"
              className="max-w-4xl text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl"
            >
              Premium systems built for <GradientHeading>visible growth.</GradientHeading>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-white/64 sm:text-base">
              A curated look at selected ecommerce builds, redesigns, and
              conversion-focused systems shaped for trust, clarity, and momentum.
            </p>
          </motion.div>

          <div className="rounded-[1.8rem] border border-[#1E314A] bg-[#0E1B2D]/70 p-5 shadow-[0_28px_100px_rgba(0,0,0,0.22)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Active Project
            </p>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">
                  {getTitle(activeItem)}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">
                  {getDescription(activeItem)}
                </p>
              </div>

              <Link
                href={getHref(activeItem)}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#39D97A] px-5 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                View Case Study
                <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="relative z-10 mx-auto mt-10 h-[570px] max-w-7xl overflow-visible px-5 sm:h-[620px] sm:px-6 md:h-[560px] md:px-10 lg:mt-14 lg:h-[610px] lg:px-12"
        drag={portfolioItems.length > 1 ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
      >
        <div className="relative h-full [perspective:1400px]">
          {visibleCards.map(({ item, index, offset }) => {
            const isActive = offset === 0

            const desktopPosition =
              offset === -2
                ? 'lg:left-[2%] lg:top-[150px] lg:w-[245px] lg:-rotate-y-[28deg] lg:scale-[0.78] lg:opacity-45 lg:blur-[1px]'
                : offset === -1
                  ? 'lg:left-[13%] lg:top-[92px] lg:w-[330px] lg:-rotate-y-[18deg] lg:scale-[0.9] lg:opacity-76'
                  : offset === 0
                    ? 'lg:left-1/2 lg:top-0 lg:w-[570px] lg:-translate-x-1/2 lg:rotate-y-0 lg:scale-100 lg:opacity-100'
                    : offset === 1
                      ? 'lg:right-[13%] lg:top-[92px] lg:w-[330px] lg:rotate-y-[18deg] lg:scale-[0.9] lg:opacity-76'
                      : 'lg:right-[2%] lg:top-[150px] lg:w-[245px] lg:rotate-y-[28deg] lg:scale-[0.78] lg:opacity-45 lg:blur-[1px]'

            const tabletPosition =
              offset === -1
                ? 'md:left-[3%] md:top-[102px] md:w-[310px] md:-rotate-y-[16deg] md:scale-[0.88] md:opacity-68'
                : offset === 0
                  ? 'md:left-1/2 md:top-0 md:w-[520px] md:-translate-x-1/2 md:scale-100 md:opacity-100'
                  : offset === 1
                    ? 'md:right-[3%] md:top-[102px] md:w-[310px] md:rotate-y-[16deg] md:scale-[0.88] md:opacity-68'
                    : 'md:hidden'

            const mobilePosition =
              offset === 0
                ? 'left-1/2 top-0 w-[88vw] max-w-[390px] -translate-x-1/2 opacity-100'
                : offset === 1
                  ? 'left-[78%] top-[42px] w-[70vw] max-w-[310px] opacity-30'
                  : 'hidden'

            return (
              <motion.article
                key={`${item.id}-${index}-${offset}`}
                layout
                initial={reducedMotion ? false : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute transform-gpu transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] ${mobilePosition} ${tabletPosition} ${desktopPosition} ${
                  isActive ? 'z-30' : 'z-10'
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                <Link
                  href={getHref(item)}
                  className={`group block overflow-hidden rounded-[2rem] border bg-[#0E1B2D] p-3 shadow-[0_28px_100px_rgba(0,0,0,0.28)] transition ${
                    isActive
                      ? 'border-[#39D97A]/42 ring-1 ring-[#39D97A]/20'
                      : 'border-[#1E314A] hover:border-[#39D97A]/22'
                  }`}
                  aria-label={`View case study for ${getTitle(item)}`}
                >
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-[#07111F]">
                    {getImage(item) ? (
                      <img
                        src={getImage(item)}
                        alt={`${getTitle(item)} portfolio preview`}
                        loading={isActive ? 'eager' : 'lazy'}
                        className={`w-full object-cover transition duration-700 group-hover:scale-[1.04] ${
                          isActive
                            ? 'aspect-[4/4.7] sm:aspect-[16/10] lg:aspect-[16/9]'
                            : 'aspect-[4/5]'
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex items-center justify-center ${
                          isActive
                            ? 'aspect-[4/4.7] sm:aspect-[16/10] lg:aspect-[16/9]'
                            : 'aspect-[4/5]'
                        }`}
                      >
                        <SvgIcon name="portfolio" size={58} color="#39D97A" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/96 via-[#07111F]/24 to-transparent" />

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
                          isActive ? 'text-2xl sm:text-4xl' : 'line-clamp-2 text-xl'
                        }`}
                      >
                        {getTitle(item)}
                      </h3>

                      {isActive && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/66 sm:text-sm sm:leading-6">
                          {getDescription(item)}
                        </p>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className="flex items-center justify-between px-2 py-4">
                      <span className="inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                        View Case Study
                        <SvgIcon name="arrow-diagonal" size={14} color="#39D97A" />
                      </span>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/45">
                        {String(index + 1).padStart(2, '0')} /{' '}
                        {String(portfolioItems.length).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </Link>
              </motion.article>
            )
          })}
        </div>
      </motion.div>

      <div className="relative z-10 mx-auto -mt-8 flex max-w-7xl flex-col items-center gap-5 px-5 text-center sm:px-6 md:px-10 lg:px-12">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Show previous featured project"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 focus:outline-none focus:ring-2 focus:ring-[#39D97A]/60"
          >
            <SvgIcon name="chevron-left" size={18} color="#39D97A" />
          </button>

          <div className="flex items-center gap-2" aria-label="Featured project position">
            {portfolioItems.slice(0, 12).map((item, index) => (
              <button
                key={item.id || index}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show featured project ${index + 1}`}
                className={`h-2.5 rounded-full transition ${
                  index === activeIndex
                    ? 'w-8 bg-[#39D97A]'
                    : 'w-2.5 bg-white/20 hover:bg-white/35'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Show next featured project"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 focus:outline-none focus:ring-2 focus:ring-[#39D97A]/60"
          >
            <SvgIcon name="chevron-right" size={18} color="#39D97A" />
          </button>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-white/55">
          {portfolioItems.length}+ selected projects across ecommerce, service
          businesses, health, lifestyle, and digital growth systems.
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
