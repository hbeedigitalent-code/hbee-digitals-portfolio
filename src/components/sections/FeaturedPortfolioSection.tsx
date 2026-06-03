'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface PortfolioItem {
  id: string
  title?: string
  name?: string
  client_name?: string
  slug?: string
  image_url?: string
  featured_image?: string
  is_active?: boolean
  display_order?: number
  featured?: boolean
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
}

function getTitle(item: PortfolioItem) {
  return item.title || item.name || item.client_name || 'Portfolio Project'
}

function getHref(item: PortfolioItem) {
  return item.slug ? `/portfolio/${item.slug}` : `/portfolio/${item.id}`
}

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  const reducedMotion = useReducedMotion()
  const [fetchedItems, setFetchedItems] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (items.length > 0) return

    let mounted = true

    async function fetchPortfolioItems() {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('portfolio_items')
        .select(
          'id, title, name, client_name, slug, image_url, featured_image, is_active, display_order, featured'
        )
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(30)

      if (!mounted) return

      if (error) {
        console.error('Featured portfolio fetch error:', error)
        setFetchedItems([])
      } else {
        setFetchedItems(data || [])
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
    return source.filter((item) => item?.id && getImage(item))
  }, [items, fetchedItems])

  if (!isLoading && portfolioItems.length === 0) {
    return (
      <section className="relative overflow-hidden bg-[var(--bg-section)] px-5 py-16 text-center sm:px-6 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Our Work
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            Active portfolio projects have not been added yet. Once projects
            are added from the admin dashboard, they will appear here
            automatically.
          </p>

          <Link
            href="/portfolio"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-9 py-3 text-sm font-bold text-[var(--btn-primary-text)] shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--accent-lime)]"
          >
            View All Work
            <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
              <SvgIcon name="arrow-diagonal" size={14} color="currentColor" />
            </span>
          </Link>
        </div>
      </section>
    )
  }

  if (portfolioItems.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[var(--bg-section)] py-14 sm:py-16 lg:py-20">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        viewport={{ once: true }}
        className="relative z-10 mx-auto max-w-5xl px-5 text-center sm:px-6"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
          <SvgIcon name="portfolio" size={14} color="var(--accent)" />
          Featured Work
        </div>

        <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Systems we built for growth.
        </h2>

        <p className="mx-auto mt-6 max-w-4xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
          Real brands. Real results. Explore a selection of our recent work that helped
          businesses improve performance and scale with clarity.
        </p>
      </motion.div>

      {/* Horizontal Scroll Cards */}
      <div className="relative z-10 mt-12 overflow-x-auto px-5 pb-4 scrollbar-hide sm:px-8 lg:px-12">
        <div className="mx-auto flex w-max gap-6 sm:gap-8 lg:gap-10">
          {portfolioItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <Link
                href={getHref(item)}
                className="group block w-[260px] shrink-0 sm:w-[320px] md:w-[380px] lg:w-[440px]"
              >
                <div className="overflow-hidden rounded-2xl bg-[var(--bg-card)] p-3 shadow-[var(--shadow-md)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[var(--shadow-lg)]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--bg-section)]">
                    <img
                      src={getImage(item)}
                      alt={getTitle(item)}
                      loading="lazy"
                      draggable={false}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 mt-12 text-center">
        <Link
          href="/portfolio"
          className="group inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[var(--btn-primary-text)] shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-[var(--accent-lime)]"
        >
          View All Work
          <span className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
            <SvgIcon name="arrow-diagonal" size={14} color="var(--btn-primary-text)" />
          </span>
        </Link>
        
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          {portfolioItems.length}+ successful projects delivered
        </p>
      </div>
    </section>
  )
}