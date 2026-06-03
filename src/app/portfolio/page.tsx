'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface PortfolioItem {
  id: string
  name?: string
  title?: string
  slug?: string
  category?: string
  tag?: string
  result?: string
  description?: string
  image_url?: string
  featured_image?: string
  featured?: boolean
  url?: string
  project_url?: string
  client_name?: string
  project_type?: string
  metric_label?: string
  metric_value?: string
  industry?: string
  technology?: string
  website_url?: string
  brief?: string
  results_summary?: string
  before_image?: string
  after_image?: string
  gallery_images?: any[]
  result_metrics?: any[]
  is_before_after?: boolean
}

function getTitle(item: PortfolioItem) {
  return item.client_name || item.title || item.name || 'Portfolio Project'
}

function getProjectType(item: PortfolioItem) {
  return item.project_type || item.description || 'Conversion-focused digital system'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || item.after_image || ''
}

function getHref(item: PortfolioItem) {
  if (item.slug) return `/portfolio/${item.slug}`
  return item.url || item.project_url || '/portfolio'
}

function getMetric(item: PortfolioItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }
  if (item.metric_value) return item.metric_value
  if (item.result) return item.result
  return 'Growth'
}

function getCategory(item: PortfolioItem) {
  return item.category || item.tag || item.industry || 'Case Study'
}

// Vertex Dimension Style Categories - Proper capitalization
const CATEGORIES = [
  { id: 'all', name: 'All', icon: '/icons/portfolio/all.svg.png' },
  { id: 'clothing', name: 'Clothing', icon: '/icons/portfolio/clothing.svg.png' },
  { id: 'food', name: 'Food', icon: '/icons/portfolio/food.svg.png' },
  { id: 'healthcare', name: 'Healthcare', icon: '/icons/portfolio/health-care.svg.png' },
  { id: 'jewellery', name: 'Jewellery', icon: '/icons/portfolio/jewellery.svg.png' },
  { id: 'kids', name: 'Kids', icon: '/icons/portfolio/kids-clothing.svg.png' },
  { id: 'branding', name: 'Branding', icon: '/icons/portfolio/logos.svg.png' },
  { id: 'pets', name: 'Pets', icon: '/icons/portfolio/pets.svg.png' },
  { id: 'skincare', name: 'Skin care', icon: '/icons/portfolio/skin-care.svg.png' },
  { id: 'sports', name: 'Sports', icon: '/icons/portfolio/sports-fitness.svg.png' },
  { id: 'redesign', name: 'Redesign', icon: '/icons/portfolio/store-redesign.svg' },
  { id: 'teacoffee', name: 'Tea/Coffee', icon: '/icons/portfolio/tea-coffee.svg.png' },
]

export default function PortfolioPage() {
  const reducedMotion = useReducedMotion()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      setItems(data || [])
      setLoading(false)
    }

    fetchItems()
  }, [])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter((item) => {
      const itemCategory = (item.category || '').toLowerCase()
      return itemCategory.includes(activeCategory)
    })
  }, [activeCategory, items])

  const visibleItems = useMemo(() => {
    return filteredItems
  }, [filteredItems])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
            <p className="text-sm font-bold text-[var(--text-muted)]">Loading portfolio...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        {/* Hero Section */}
        <section className="relative px-5 pb-12 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-5xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--bg-card)]/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                <SvgIcon name="portfolio" size={14} color="var(--accent)" />
                Portfolio / Case Studies
              </div>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.055em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                Digital systems built to <GradientHeading>perform.</GradientHeading>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                Explore selected ecommerce builds, redesigns, before-and-after improvements,
                and conversion-focused systems created to improve trust, usability, and growth.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Category Filters - Vertex Dimension Style */}
        <section className="relative px-5 py-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                Our Work
              </p>
            </div>

            {/* Categories Grid - Centered with flex wrap */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {CATEGORIES.map((category) => {
                const active = activeCategory === category.id
                
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={`group relative flex flex-col items-center rounded-2xl px-4 py-3 transition-all duration-300 ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]/30 hover:shadow-md'
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 items-center justify-center transition-all duration-300 group-hover:scale-105">
                      <img
                        src={category.icon}
                        alt={category.name}
                        className="h-6 w-6 object-contain"
                        style={{
                          filter: active 
                            ? 'brightness(0) saturate(100%) invert(82%) sepia(58%) saturate(626%) hue-rotate(73deg) brightness(94%) contrast(89%)' 
                            : 'brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) brightness(90%) contrast(80%)'
                        }}
                      />
                    </div>
                    
                    {/* Category Name */}
                    <span className={`mt-2 text-xs font-medium transition-all duration-300 ${
                      active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    }`}>
                      {category.name}
                    </span>
                    
                    {/* Active Indicator - Small dot under active category */}
                    {active && (
                      <motion.div
                        layoutId="activeCategoryDot"
                        className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Portfolio Grid */}
        <section className="relative px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {visibleItems.slice(0, 12).map((item, index) => (
                  <motion.article
                    key={item.id || getTitle(item)}
                    initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="group relative"
                  >
                    <Link
                      href={getHref(item)}
                      className="block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[var(--shadow-lg)]"
                    >
                      {/* Image Container */}
                      <div className="relative overflow-hidden">
                        {getImage(item) ? (
                          <img
                            src={getImage(item)}
                            alt={getTitle(item)}
                            className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center bg-[var(--bg-section)]">
                            <SvgIcon name="portfolio" size={48} color="var(--accent)" />
                          </div>
                        )}
                        
                        {/* Metric Badge */}
                        <div className="absolute left-3 top-3 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-black text-[var(--btn-primary-text)]">
                          {getMetric(item)}
                        </div>
                        
                        {/* Before/After Badge */}
                        {item.is_before_after && (
                          <div className="absolute right-3 top-3 rounded-full border border-[var(--border)] bg-[var(--bg-page)]/80 px-2.5 py-1 text-[10px] font-black text-[var(--text-primary)] backdrop-blur-sm">
                            Before/After
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                              {getCategory(item)}
                            </p>
                            <h3 className="mt-2 text-xl font-black leading-tight text-[var(--text-primary)]">
                              {getTitle(item)}
                            </h3>
                          </div>
                          <span className="text-xs font-bold text-[var(--text-muted)]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        
                        <p className="mt-3 line-clamp-2 text-sm text-[var(--text-secondary)]">
                          {getProjectType(item)}
                        </p>
                        
                        <div className="mt-4 flex items-center justify-between pt-3">
                          <div className="flex gap-2">
                            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-2 py-1 text-[9px] font-black uppercase text-[var(--text-muted)]">
                              {item.industry || getCategory(item)}
                            </span>
                            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-2 py-1 text-[9px] font-black uppercase text-[var(--text-muted)]">
                              {item.technology || 'Digital Growth'}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm font-black text-[var(--accent)] transition group-hover:gap-2">
                            View
                            <SvgIcon name="arrow-diagonal" size={12} color="var(--accent)" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </motion.div>
            </AnimatePresence>

            {visibleItems.length === 0 && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-14 text-center">
                <SvgIcon name="portfolio" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
                <h3 className="text-xl font-black text-[var(--text-primary)]">No projects found</h3>
                <p className="mt-2 text-[var(--text-secondary)]">Try selecting another category.</p>
              </div>
            )}
          </div>
        </section>

        {/* View All Link */}
        {visibleItems.length > 9 && (
          <div className="px-5 pb-12 text-center sm:px-6 md:px-10 lg:px-12">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] transition hover:gap-3"
            >
              View All Work
              <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
            </Link>
          </div>
        )}

        {/* CTA Section */}
        <section className="relative px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-gradient-to-r from-[var(--accent)]/5 to-transparent p-8 text-center sm:p-12">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                Ready for your transformation?
              </p>
              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-4xl">
                Let's build a digital system that improves trust and drives growth.
              </h2>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-gradient-orange-green px-6 py-2.5 text-sm font-black text-white transition hover:scale-[1.02]"
                >
                  Get Free Audit
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-6 py-2.5 text-sm font-black text-[var(--accent)] transition hover:bg-[var(--accent)]/15"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}