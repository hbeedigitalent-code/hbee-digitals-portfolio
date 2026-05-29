'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  const reducedMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const portfolioItems = useMemo(() => items.filter(Boolean), [items])

  useEffect(() => {
    const container = scrollRef.current
    if (!container || portfolioItems.length === 0) return

    function updateActiveCard() {
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2

      let closestIndex = 0
      let closestDistance = Number.POSITIVE_INFINITY

      cardRefs.current.forEach((card, index) => {
        if (!card) return

        const rect = card.getBoundingClientRect()
        const cardCenter = rect.left + rect.width / 2
        const distance = Math.abs(containerCenter - cardCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestIndex = index
        }
      })

      setActiveIndex(closestIndex)
    }

    updateActiveCard()

    container.addEventListener('scroll', updateActiveCard, { passive: true })
    window.addEventListener('resize', updateActiveCard)

    return () => {
      container.removeEventListener('scroll', updateActiveCard)
      window.removeEventListener('resize', updateActiveCard)
    }
  }, [portfolioItems.length])

  if (!portfolioItems.length) return null

  return (
    <section className="relative overflow-hidden bg-[#07111F] py-16 text-white lg:py-24">
      <div className="absolute inset-0 -z-0">
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
          className="mx-auto max-w-4xl text-center"
        >
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="portfolio" size={14} color="#39D97A" />
            Our Work
          </p>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Selected systems built for <GradientHeading>growth.</GradientHeading>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
            Scroll through selected ecommerce builds, redesigns, and conversion-focused
            digital systems created to improve trust, usability, and business growth.
          </p>
        </motion.div>
      </div>

      <div
        ref={scrollRef}
        className="relative z-10 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[10vw] pb-8 pt-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-6 lg:mt-16 lg:px-[18vw]"
        aria-label="Scrollable portfolio showcase"
      >
        {portfolioItems.map((item, index) => {
          const isActive = index === activeIndex

          return (
            <Link
              key={item.id || index}
              ref={(element) => {
                cardRefs.current[index] = element
              }}
              href={getHref(item)}
              className={`group relative flex-shrink-0 snap-center overflow-hidden rounded-[2rem] border bg-[#0E1B2D] p-3 transition-all duration-500 ${
                isActive
                  ? 'w-[82vw] border-[#39D97A]/35 shadow-[0_28px_100px_rgba(57,217,122,0.12)] sm:w-[620px] lg:w-[720px] lg:scale-105'
                  : 'w-[72vw] border-[#1E314A] opacity-75 hover:opacity-100 sm:w-[420px] lg:w-[440px] lg:scale-90'
              }`}
            >
              <div className="relative overflow-hidden rounded-[1.5rem] bg-[#07111F]">
                {getImage(item) ? (
                  <img
                    src={getImage(item)}
                    alt={getTitle(item)}
                    loading={index < 3 ? 'eager' : 'lazy'}
                    className={`w-full object-cover transition duration-700 group-hover:scale-[1.04] ${
                      isActive
                        ? 'aspect-[16/10] sm:aspect-[16/9]'
                        : 'aspect-[4/5] sm:aspect-[4/3]'
                    }`}
                  />
                ) : (
                  <div
                    className={`flex items-center justify-center ${
                      isActive
                        ? 'aspect-[16/10] sm:aspect-[16/9]'
                        : 'aspect-[4/5] sm:aspect-[4/3]'
                    }`}
                  >
                    <SvgIcon name="portfolio" size={64} color="#39D97A" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/92 via-[#07111F]/15 to-transparent" />

                <div className="absolute left-4 top-4 rounded-full bg-[#39D97A] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#06101F] sm:left-5 sm:top-5">
                  {getMetric(item)}
                </div>

                {item.is_before_after && (
                  <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-[#07111F]/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl sm:right-5 sm:top-5">
                    Before / After
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                    {getCategory(item)}
                  </p>

                  <h3
                    className={`mt-2 font-black tracking-[-0.04em] text-white ${
                      isActive ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {getTitle(item)}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/62">
                    {item.project_type ||
                      item.description ||
                      'Premium digital system built for clearer trust and better growth.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-4">
                <span className="inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                  View Case Study
                  <SvgIcon name="arrow-diagonal" size={14} color="#39D97A" />
                </span>

                <span className="text-xs font-bold text-white/35">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="relative z-10 mx-auto mt-2 max-w-7xl px-5 text-center sm:px-6 md:px-10 lg:px-12">
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