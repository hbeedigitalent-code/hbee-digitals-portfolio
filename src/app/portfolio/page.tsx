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
  result?: string
  image_url?: string
  featured_image?: string
  tag?: string
  featured?: boolean
  url?: string
  project_url?: string
  description?: string
}

function getTitle(item: PortfolioItem) {
  return item.title || item.name || 'Portfolio Project'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
}

function getHref(item: PortfolioItem) {
  if (item.slug) return `/portfolio/${item.slug}`
  return item.url || item.project_url || '/portfolio'
}

function getCategoryIcon(category?: string) {
  const value = (category || '').toLowerCase()

  if (value.includes('ecommerce') || value.includes('store')) return 'ecommerce'
  if (value.includes('brand')) return 'branding'
  if (value.includes('marketing')) return 'digital-marketing'
  if (value.includes('ui') || value.includes('ux')) return 'ui-ux'
  if (value.includes('web')) return 'web-development'
  if (value.includes('logo')) return 'branding'

  return 'portfolio'
}

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

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(items.map((item) => item.category || item.tag).filter(Boolean))
    ) as string[]

    return ['all', ...unique]
  }, [items])

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items

    return items.filter(
      (item) => item.category === activeCategory || item.tag === activeCategory
    )
  }, [activeCategory, items])

  const featuredItem = useMemo(() => {
    return items.find((item) => item.featured) || items[0]
  }, [items])

  const visibleItems = useMemo(() => {
    if (activeCategory !== 'all') return filteredItems
    return filteredItems.filter((item) => item.id !== featuredItem?.id)
  }, [activeCategory, filteredItems, featuredItem])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#07111F] text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
            <p className="text-sm font-bold text-white/45">Loading portfolio...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        <section className="relative px-5 pb-12 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-5xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#0E1B2D]/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="portfolio" size={14} color="#39D97A" />
                Portfolio / Case Studies
              </div>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                Digital systems built to <GradientHeading>perform.</GradientHeading>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                Explore selected projects, ecommerce builds, redesigns, and conversion-focused
                systems created to improve trust, usability, and business growth.
              </p>
            </motion.div>
          </div>
        </section>

        {featuredItem && activeCategory === 'all' && (
          <section className="relative px-5 pb-12 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="group grid overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-3 shadow-[0_32px_100px_rgba(0,0,0,0.28)] lg:grid-cols-[1.1fr_0.9fr]"
              >
                <Link
                  href={getHref(featuredItem)}
                  className="relative block min-h-[360px] overflow-hidden rounded-[1.7rem] bg-[#07111F] sm:min-h-[460px]"
                >
                  {getImage(featuredItem) ? (
                    <img
                      src={getImage(featuredItem)}
                      alt={getTitle(featuredItem)}
                      loading="eager"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center">
                      <SvgIcon name="portfolio" size={72} color="#39D97A" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/85 via-[#07111F]/15 to-transparent" />

                  <div className="absolute left-5 top-5 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A] backdrop-blur-xl">
                    Featured Case Study
                  </div>
                </Link>

                <div className="relative p-6 sm:p-8 lg:p-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.11),transparent_40%)]" />

                  <div className="relative">
                    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                      {featuredItem.tag || featuredItem.category || 'Growth Project'}
                    </p>

                    <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] sm:text-4xl md:text-5xl">
                      {getTitle(featuredItem)}
                    </h2>

                    <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                      {featuredItem.description ||
                        'A selected digital project designed to improve customer experience, trust, conversion, and brand performance.'}
                    </p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                      {['Problem', 'System', 'Result'].map((label) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-[#1E314A] bg-[#07111F]/90 px-4 py-3"
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
                            {label}
                          </p>
                          <p className="mt-2 text-sm font-black text-white">
                            {label === 'Result'
                              ? featuredItem.result || 'Improved growth'
                              : 'Structured'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={getHref(featuredItem)}
                      className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                    >
                      View Case Study
                      <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        <section className="relative px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => {
                const active = activeCategory === category

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                      active
                        ? 'border-[#39D97A]/30 bg-[#39D97A]/10 text-[#39D97A]'
                        : 'border-[#1E314A] bg-[#0E1B2D] text-white/48 hover:text-white'
                    }`}
                  >
                    <SvgIcon
                      name={category === 'all' ? 'portfolio' : getCategoryIcon(category)}
                      size={13}
                      color={active ? '#39D97A' : '#A7B4C7'}
                    />
                    {category === 'all' ? 'All Work' : category}
                  </button>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
              >
                {visibleItems.map((item, index) => (
                  <motion.div
                    key={item.id || getTitle(item)}
                    initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                    viewport={{ once: true }}
                  >
                    <Link
                      href={getHref(item)}
                      className="group block overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3 transition hover:-translate-y-1 hover:border-[#39D97A]/25"
                    >
                      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#07111F]">
                        {getImage(item) ? (
                          <img
                            src={getImage(item)}
                            alt={getTitle(item)}
                            className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                          />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center">
                            <SvgIcon name="portfolio" size={60} color="#39D97A" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/86 via-transparent to-transparent" />

                        <div className="absolute bottom-4 left-4 right-4">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                            {item.category || item.tag || 'Case Study'}
                          </p>

                          <h3 className="text-xl font-black text-white">
                            {getTitle(item)}
                          </h3>

                          {item.description && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-2 py-4">
                        <span className="inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                          View Case Study
                          <SvgIcon name="arrow-diagonal" size={14} color="#39D97A" />
                        </span>

                        <span className="rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]">
                          {item.result || 'Growth'}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {visibleItems.length === 0 && (
              <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] px-6 py-14 text-center">
                <SvgIcon name="portfolio" size={50} color="#39D97A" />
                <h3 className="mt-5 text-2xl font-black text-white">No projects found</h3>
                <p className="mt-3 text-white/55">
                  Try selecting another category.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}