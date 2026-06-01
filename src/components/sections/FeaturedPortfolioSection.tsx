'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
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
  is_active?: boolean
  display_order?: number
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

  return item.metric_value || 'Growth System'
}

function getHref(item: PortfolioItem) {
  return item.slug ? `/portfolio/${item.slug}` : '/portfolio'
}

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length
}

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  const reducedMotion = useReducedMotion()
  const [fetchedItems, setFetchedItems] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (items.length > 0) return

    let mounted = true

    async function fetchPortfolioItems() {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('portfolio_items')
        .select(
          'id,title,name,client_name,slug,category,industry,project_type,description,image_url,featured_image,metric_value,metric_label,before_image,after_image,is_before_after,is_active,display_order'
        )
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(12)

      if (!mounted) return

      if (!error && data) {
        setFetchedItems(data)
      }

      setIsLoading(false)
    }

    fetchPortfolioItems()

    return () => {
      mounted = false
    }
  }, [items.length])

  const portfolioItems = useMemo(() => {
    const source = items.length > 0 ? items : fetchedItems

    return source.filter((item) => item && item.id)
  }, [items, fetchedItems])

  useEffect(() => {
    if (portfolioItems.length === 0) return

    setActiveIndex(0)
  }, [portfolioItems.length])

  useEffect(() => {
    if (reducedMotion || portfolioItems.length <= 1) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => wrapIndex(prev + 1, portfolioItems.length))
    }, 6500)

    return () => clearInterval(timer)
  }, [portfolioItems.length, reducedMotion])

  function goNext() {
    if (portfolioItems.length === 0) return
    setActiveIndex((prev) => wrapIndex(prev + 1, portfolioItems.length))
  }

  function goPrev() {
    if (portfolioItems.length === 0) return
    setActiveIndex((prev) => wrapIndex(prev - 1, portfolioItems.length))
  }

  const visibleCards = useMemo(() => {
    if (portfolioItems.length === 0) return []

    return [-2, -1, 0, 1, 2].map((offset) => {
      const index = wrapIndex(activeIndex + offset, portfolioItems.length)

      return {
        item: portfolioItems[index],
        index,
        offset,
      }
    })
  }, [activeIndex, portfolioItems])

  if (!isLoading && portfolioItems.length === 0) {
    return (
      <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute left-1/2 top-10 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[140px]" />

        <div className="relative z-10 mx-auto max-w-5xl rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.25)]">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="portfolio" size={14} color="#39D97A" />
            Featured Work
          </p>

          <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] sm:text-5xl">
            Featured projects will appear here soon.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Active portfolio items were not found yet. Once portfolio projects
            are added or activated from the admin dashboard, they will display
            here automatically.
          </p>

          <Link
            href="/portfolio"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
          >
            View Portfolio
          </Link>
        </div>
      </section>
    )
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

      <div className="relative z-10 mx-auto mt-10 h-[610px] max-w-7xl px-5 sm:h-[650px] sm:px-6 md:px-10 lg:mt-14 lg:h-[620px] lg:px-12">
        <motion.div
          className="relative h-full"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            if (info.offset.x < -80) goNext()
            if (info.offset.x > 80) goPrev()
          }}
        >
          {visibleCards.map(({ item, index, offset }) => {
            const isActive = offset === 0

            const mobilePosition =
              offset === 0
                ? 'left-1/2 top-0 w-[88vw] -translate-x-1/2 opacity-100'
                : offset === 1
                  ? 'left-[78%] top-[44px] w-[70vw] opacity-30'
                  : offset === -1
                    ? 'right-[78%] top-[44px] w-[70vw] opacity-30'
                    : 'hidden'

            const tabletPosition =
              offset === -1
                ? 'md:left-[1%] md:top-[96px] md:block md:w-[310px] md:scale-[0.86] md:opacity-65'
                : offset === 0
                  ? 'md:left-1/2 md:top-0 md:w-[520px] md:-translate-x-1/2 md:scale-100 md:opacity-100'
                  : offset === 1
                    ? 'md:right-[1%] md:top-[96px] md:block md:w-[310px] md:scale-[0.86] md:opacity-65'
                    : 'md:hidden'

            const desktopPosition =
              offset === -2
                ? 'lg:left-[0%] lg:top-[140px] lg:block lg:w-[230px] lg:scale-[0.72] lg:opacity-40 lg:blur-[1.5px]'
                : offset === -1
                  ? 'lg:left-[12%] lg:top-[90px] lg:block lg:w-[330px] lg:scale-[0.86] lg:opacity-70'
                  : offset === 0
                    ? 'lg:left-1/2 lg:top-0 lg:w-[580px] lg:-translate-x-1/2 lg:scale-100 lg:opacity-100'
                    : offset === 1
                      ? 'lg:right-[12%] lg:top-[90px] lg:block lg:w-[330px] lg:scale-[0.86] lg:opacity-70'
                      : 'lg:right-[0%] lg:top-[140px] lg:block lg:w-[230px] lg:scale-[0.72] lg:opacity-40 lg:blur-[1.5px]'

            return (
              <motion.div
                key={`${item.id}-${index}-${offset}`}
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
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
                            ? 'aspect-[4/4.8] sm:aspect-[16/10] lg:aspect-[16/9]'
                            : 'aspect-[4/5]'
                        }`}
                      />
                    ) : (
                      <div
                        className={`flex items-center justify-center ${
                          isActive
                            ? 'aspect-[4/4.8] sm:aspect-[16/10] lg:aspect-[16/9]'
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
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto -mt-6 flex max-w-7xl flex-col items-center gap-5 px-5 text-center sm:px-6 md:px-10 lg:px-12">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous portfolio item"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] text-xl font-black text-[#39D97A] transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next portfolio item"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] text-xl font-black text-[#39D97A] transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10"
          >
            ›
          </button>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-white/55">
          {portfolioItems.length}+ selected projects across ecommerce, health,
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