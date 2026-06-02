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

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
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

      // First try: Get featured items
      let { data: featuredData } = await supabase
        .from('portfolio_items')
        .select(
          'id,title,name,client_name,slug,category,industry,project_type,description,image_url,featured_image,metric_value,metric_label,before_image,after_image,is_before_after,is_active,display_order'
        )
        .eq('is_active', true)
        .eq('featured', true)
        .order('display_order', { ascending: true })
        .limit(12)

      // Fallback to all active items if no featured
      if (!featuredData?.length) {
        let { data: allData } = await supabase
          .from('portfolio_items')
          .select(
            'id,title,name,client_name,slug,category,industry,project_type,description,image_url,featured_image,metric_value,metric_label,before_image,after_image,is_before_after,is_active,display_order'
          )
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(12)
        featuredData = allData
      }

      if (!mounted) return

      if (featuredData) {
        setFetchedItems(featuredData)
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
    }, 6000)

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

  // Fallback when no portfolio items exist
  if (!isLoading && portfolioItems.length === 0) {
    return (
      <section className="relative overflow-hidden bg-[var(--bg-navy)] px-5 py-16 text-[var(--text-inverse)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:80px_80px]" />
        <div className="absolute left-1/2 top-10 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-[140px]" />

        <div className="relative z-10 mx-auto max-w-5xl rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-md)]">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            <SvgIcon name="portfolio" size={14} color="var(--accent)" />
            Featured Work
          </p>

          <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[var(--text-inverse)] sm:text-5xl">
            Featured projects will appear here soon.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
            Active portfolio projects have not been added yet. Once projects
            are featured or starred from the admin dashboard, they will appear here automatically.
          </p>

          <Link
            href="/portfolio"
            className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
          >
            View Portfolio
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden bg-[var(--bg-navy)] py-16 text-[var(--text-inverse)] lg:py-24">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-[440px] w-[760px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-[var(--accent)]/5 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      {/* Header */}
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            <SvgIcon name="portfolio" size={14} color="var(--accent)" />
            Featured Work
          </p>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-inverse)] sm:text-5xl md:text-6xl">
            Selected projects we're <GradientHeading>proud of.</GradientHeading>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            Explore our featured case studies and see how we help brands grow.
          </p>
        </motion.div>
      </div>

      {/* Coverflow Carousel - Images Only, No Text */}
      <div className="relative z-10 mx-auto mt-10 h-[400px] max-w-7xl px-5 sm:h-[500px] sm:px-6 md:px-10 lg:mt-14 lg:h-[550px] lg:px-12">
        <motion.div
          className="relative h-full w-full"
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
            const image = getImage(item)

            // Mobile positioning
            const mobilePosition = offset === 0
              ? 'left-1/2 top-0 w-[85vw] -translate-x-1/2 opacity-100 z-30'
              : offset === 1
              ? 'left-[75%] top-[30px] w-[60vw] opacity-40 z-20'
              : offset === -1
              ? 'right-[75%] top-[30px] w-[60vw] opacity-40 z-20'
              : 'hidden'

            // Tablet positioning (3 cards)
            const tabletPosition = offset === 0
              ? 'md:left-1/2 md:top-0 md:w-[450px] md:-translate-x-1/2 md:scale-100 md:opacity-100 md:z-30'
              : offset === 1
              ? 'md:right-[5%] md:top-[40px] md:block md:w-[280px] md:scale-90 md:opacity-60 md:z-20'
              : offset === -1
              ? 'md:left-[5%] md:top-[40px] md:block md:w-[280px] md:scale-90 md:opacity-60 md:z-20'
              : 'md:hidden'

            // Desktop positioning (5 cards)
            const desktopPosition = offset === 0
              ? 'lg:left-1/2 lg:top-0 lg:w-[500px] lg:-translate-x-1/2 lg:scale-100 lg:opacity-100 lg:z-30'
              : offset === 1
              ? 'lg:right-[10%] lg:top-[60px] lg:block lg:w-[300px] lg:scale-85 lg:opacity-70 lg:z-20'
              : offset === -1
              ? 'lg:left-[10%] lg:top-[60px] lg:block lg:w-[300px] lg:scale-85 lg:opacity-70 lg:z-20'
              : offset === 2
              ? 'lg:right-[2%] lg:top-[100px] lg:block lg:w-[220px] lg:scale-75 lg:opacity-40 lg:z-10'
              : offset === -2
              ? 'lg:left-[2%] lg:top-[100px] lg:block lg:w-[220px] lg:scale-75 lg:opacity-40 lg:z-10'
              : 'lg:hidden'

            return (
              <motion.div
                key={`${item.id}-${index}-${offset}`}
                initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${mobilePosition} ${tabletPosition} ${desktopPosition}`}
              >
                <Link
                  href={getHref(item)}
                  className="group block overflow-hidden rounded-2xl shadow-xl transition-all duration-500 hover:shadow-2xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--bg-section)]">
                    {image ? (
                      <img
                        src={image}
                        alt={item.client_name || item.title || 'Portfolio project'}
                        loading={isActive ? 'eager' : 'lazy'}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <SvgIcon name="portfolio" size={58} color="var(--accent)" />
                      </div>
                    )}
                    
                    {/* Subtle gradient overlay for better visibility of case study link on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    
                    {/* View Case Study button on hover */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full transition-transform duration-500 group-hover:translate-y-0">
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-black text-[var(--btn-primary-text)]">
                        View Case Study
                        <SvgIcon name="arrow-diagonal" size={12} color="var(--btn-primary-text)" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Navigation dots / indicators */}
      <div className="relative z-10 mx-auto mt-8 flex items-center justify-center gap-2">
        {portfolioItems.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === activeIndex ? 'w-8 bg-[var(--accent)]' : 'w-2 bg-[var(--text-muted)]'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Navigation arrows */}
      <div className="relative z-10 mx-auto mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous project"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-xl font-black text-[var(--accent)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/10"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next project"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-xl font-black text-[var(--accent)] transition hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/10"
        >
          ›
        </button>
      </div>

      {/* View all link */}
      <div className="relative z-10 mx-auto mt-8 text-center">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)] transition hover:gap-3"
        >
          View All Work
          <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
        </Link>
      </div>
    </section>
  )
}