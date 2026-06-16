'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface PortfolioItem {
  id: string
  title?: string
  name?: string
  client_name?: string
  slug?: string
  category?: string
  industry?: string
  project_type?: string
  image_url?: string
  featured_image?: string
  metric_value?: string
  metric_label?: string
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

function getCategory(item: PortfolioItem) {
  return item.category || item.project_type || item.industry || 'Featured Project'
}

function getMetric(item: PortfolioItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }
  return null
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
          'id, title, name, client_name, slug, category, industry, project_type, image_url, featured_image, metric_value, metric_label, is_active, display_order, featured'
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
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              FEATURED WORK
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Systems We Built for Growth.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            Active portfolio projects have not been added yet. Once projects
            are added from the admin dashboard, they will appear here
            automatically.
          </p>
          <Button href="/portfolio" variant="primary" size="md" className="mt-8">
            View All Work
            <SvgIcon name="arrow-diagonal" size={14} color="white" className="ml-2 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Button>
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

      {/* Section Header */}
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
          Systems we built for <span className="text-[var(--accent)]">growth.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-4xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
          Real brands. Real results. Explore a selection of our recent work that helped
          businesses improve performance and scale with clarity.
        </p>
      </motion.div>

      {/* Horizontal Scroll Cards */}
      <div className="relative z-10 mt-12 overflow-x-auto px-5 pb-4 scrollbar-hide sm:px-8 lg:px-12">
        <div className="mx-auto flex w-max gap-6 sm:gap-8 lg:gap-10">
          {portfolioItems.map((item, index) => {
            const category = getCategory(item)
            const metric = getMetric(item)
            const imageUrl = getImage(item)

            return (
              <motion.div
                key={item.id}
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Link
                  href={getHref(item)}
                  className="group block w-[280px] shrink-0 sm:w-[340px] md:w-[400px] lg:w-[460px]"
                >
                  <div className="overflow-hidden rounded-2xl bg-[var(--bg-card)] p-3 shadow-[var(--shadow-md)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[var(--shadow-lg)]">
                    {/* Image Container - 16:10 aspect ratio */}
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[var(--bg-section)]">
                      <img
                        src={imageUrl}
                        alt={getTitle(item)}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                      />
                      
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      
                      {/* Category Badge - Orange accent */}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                          {category}
                        </span>
                      </div>

                      {/* Metric Badge - Appears on hover */}
                      {metric && (
                        <div className="absolute bottom-3 right-3 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-black text-white">
                            <SvgIcon name="growth" size={10} color="var(--accent)" />
                            {metric}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4">
                      <h3 className="text-base font-bold text-[var(--text-primary)] line-clamp-1 transition-colors duration-300 group-hover:text-[var(--accent)]">
                        {getTitle(item)}
                      </h3>
                      
                      {/* View Project Link - Appears on hover */}
                      <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[var(--accent)] opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        View Project
                        <SvgIcon name="arrow-right" size={12} color="var(--accent)" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Bottom CTA - Using Button component with proper size md */}
      <div className="relative z-10 mt-12 text-center">
        <Button href="/portfolio" variant="cta" size="md">
          View All Work
          <SvgIcon name="arrow-diagonal" size={14} color="white" className="ml-2 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
        </Button>
        
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          {portfolioItems.length}+ successful projects delivered
        </p>
      </div>
    </section>
  )
}