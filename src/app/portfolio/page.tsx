'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import { categories, type Category } from '@/lib/projects'

interface PortfolioItem {
  id: string
  name: string
  category: string
  result: string
  image_url: string
  tag: string
  featured: boolean
  url: string
  description: string
}

function getCategoryIcon(category: Category) {
  const value = `${category.id} ${category.label}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/--+/g, '-')

  if (value.includes('logo')) return 'logos'
  if (value.includes('clothing-fashion')) return 'clothing-fashion'
  if (value.includes('kids-clothing')) return 'kids-clothing'
  if (value.includes('jewellery') || value.includes('jewelry')) return 'jewellery'
  if (value.includes('food')) return 'food'
  if (value.includes('tea-coffee')) return 'tea-coffee'
  if (value.includes('skin-care')) return 'skin-care'
  if (value.includes('sports-fitness')) return 'sports-fitness'
  if (value.includes('health-care')) return 'health-care'
  if (value.includes('pets')) return 'pets'
  if (value.includes('store-redesign')) return 'store-redesign'
  if (value.includes('ecommerce')) return 'ecommerce'

  return 'all'
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
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

  const allCategories = useMemo(
    () => categories.filter((category) => category.id !== 'all'),
    []
  )

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items
    return items.filter((item) => item.category === activeCategory)
  }, [activeCategory, items])

  const featuredItem = useMemo(() => {
    return items.find((item) => item.featured) || items[0]
  }, [items])

  const visibleItems = useMemo(() => {
    if (activeCategory !== 'all') return filteredItems
    return filteredItems.filter((item) => item.id !== featuredItem?.id)
  }, [activeCategory, filteredItems, featuredItem])

  const projectCount = activeCategory === 'all' ? visibleItems.length : filteredItems.length

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
          <div className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#123F2B]/38 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.022)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
        </div>

        <section className="relative px-5 pb-12 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-5xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#0E1B2D]/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="portfolio" size={14} color="#39D97A" />
                Portfolio / Case Studies
              </div>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Ecommerce, website, and growth systems built to{' '}
                <CurvedUnderlineText>perform.</CurvedUnderlineText>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                Explore selected digital projects, redesigns, ecommerce builds, and conversion-focused
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
                className="group grid overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] shadow-[0_32px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]"
              >
                <Link
                  href={featuredItem.url || '/portfolio'}
                  target={featuredItem.url ? '_blank' : undefined}
                  rel={featuredItem.url ? 'noopener noreferrer' : undefined}
                  className="relative block min-h-[330px] overflow-hidden bg-[#0B1728] sm:min-h-[420px] lg:min-h-full"
                >
                  {featuredItem.image_url ? (
                    <img
                      src={featuredItem.image_url}
                      alt={featuredItem.name}
                      loading="eager"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center">
                      <SvgIcon name="portfolio" size={72} color="#39D97A" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/80 via-[#07111F]/15 to-transparent" />

                  <div className="absolute left-5 top-5 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A] backdrop-blur-xl">
                    Featured Case Study
                  </div>
                </Link>

                <div className="relative p-6 sm:p-8 lg:p-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.11),transparent_40%)]" />

                  <div className="relative">
                    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                      {featuredItem.tag || 'Growth Project'}
                    </p>

                    <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] sm:text-4xl md:text-5xl">
                      {featuredItem.name}
                    </h2>

                    <p className="mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                      {featuredItem.description ||
                        'A selected digital project designed to improve customer experience, trust, conversion, and brand performance.'}
                    </p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                      {['Problem', 'System', 'Result'].map((label) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-[#1E314A] bg-[#0B1728]/90 px-4 py-3"
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
                            {label}
                          </p>
                          <p className="mt-2 text-sm font-black text-white">
                            {label === 'Result' ? featuredItem.result || 'Improved growth' : 'Structured'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={featuredItem.url || '/portfolio'}
                      target={featuredItem.url ? '_blank' : undefined}
                      rel={featuredItem.url ? 'noopener noreferrer' : undefined}
                      className="group/link mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                    >
                      View Project
                      <SvgIcon
                        name="arrow-diagonal"
                        size={16}
                        color="#06101F"
                        className="transition group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                      />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        <section className="sticky top-[86px] z-30 px-5 pb-8 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-x-auto rounded-[1.7rem] border border-[#1E314A] bg-[#0C1727]/92 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
              <div className="flex min-w-max gap-3">
                <CategoryButton
                  label="All"
                  icon="all"
                  active={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                />

                {allCategories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    label={category.label}
                    icon={getCategoryIcon(category)}
                    active={activeCategory === category.id}
                    onClick={() => setActiveCategory(category.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-white/48">
                Showing <span className="font-black text-[#39D97A]">{projectCount}</span>{' '}
                project{projectCount === 1 ? '' : 's'}
              </p>

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/32">
                Case-study inspired portfolio
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -14 }}
                transition={{ duration: 0.3 }}
              >
                {(activeCategory === 'all' ? visibleItems : filteredItems).length === 0 ? (
                  <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]/90 px-6 py-16 text-center backdrop-blur-xl">
                    <SvgIcon name="portfolio" size={48} color="#39D97A" className="mx-auto mb-4" />
                    <h3 className="text-xl font-black text-white">No projects in this category yet</h3>
                    <p className="mt-2 text-sm text-white/45">Check back soon for new case studies.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {(activeCategory === 'all' ? visibleItems : filteredItems).map((item, index) => (
                      <PortfolioCard
                        key={item.id}
                        item={item}
                        index={index}
                        reducedMotion={Boolean(reducedMotion)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-16 overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-8">
              <h2 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">
                Want a project that looks and performs like this?
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Let’s create a premium digital system for your website, store, or brand growth.
              </p>

              <Link
                href="/contact"
                className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                Start Your Project
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function CategoryButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex min-h-[50px] flex-shrink-0 items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-black transition-all duration-300 ${
        active
          ? 'border-[#39D97A] bg-[#39D97A] text-[#06101F] shadow-[0_0_30px_rgba(57,217,122,0.18)]'
          : 'border-[#1E314A] bg-[#0E1B2D] text-white/74 hover:border-[#39D97A]/30 hover:bg-[#13233A] hover:text-white'
      }`}
    >
      <span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition duration-300 ${
          active
            ? 'bg-[#06101F]/10'
            : 'border border-[#39D97A]/18 bg-[#39D97A]/10 group-hover:bg-[#39D97A]/14'
        }`}
      >
        <img
          src={`/icons/portfolio/${icon}.svg`}
          alt=""
          aria-hidden="true"
          className={`h-4 w-4 object-contain transition duration-300 ${
            active
              ? 'brightness-0'
              : 'brightness-0 invert opacity-90 group-hover:opacity-100'
          }`}
        />
      </span>

      <span>{label}</span>
    </button>
  )
}

function PortfolioCard({
  item,
  index,
  reducedMotion,
}: {
  item: PortfolioItem
  index: number
  reducedMotion: boolean
}) {
  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: index * 0.045 }}
      viewport={{ once: true }}
      className="group overflow-hidden rounded-[1.8rem] border border-[#1E314A] bg-[#0E1B2D]/90 shadow-[0_28px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-[#39D97A]/30 hover:bg-[#13233A]"
    >
      <Link
        href={item.url || '/portfolio'}
        target={item.url ? '_blank' : undefined}
        rel={item.url ? 'noopener noreferrer' : undefined}
        className="block"
      >
        <div className="relative h-64 overflow-hidden bg-[#0B1728]">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <SvgIcon name="portfolio" size={58} color="#39D97A" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/20 to-transparent" />

          <div className="absolute left-4 top-4 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#39D97A] backdrop-blur-xl">
            {item.tag || 'Project'}
          </div>

          {item.result && (
            <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-[#07111F]/72 px-3 py-1.5 text-xs font-bold text-white/75 backdrop-blur-xl">
              {item.result}
            </div>
          )}
        </div>

        <div className="p-6">
          <h3 className="text-2xl font-black leading-tight tracking-[-0.035em] text-white">
            {item.name}
          </h3>

          <p className="mt-4 line-clamp-3 text-sm leading-7 text-white/58">
            {item.description ||
              'A conversion-focused digital project built with strategy, structure, and premium execution.'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {['Challenge', 'System', 'Growth'].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-[#1E314A] bg-[#0B1728]/90 px-3 py-2 text-center text-[11px] font-bold text-white/50"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#39D97A] transition group-hover:text-[#C6F135]">
            Visit Website
            <SvgIcon
              name="arrow-diagonal"
              size={15}
              color="#39D97A"
              className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </div>
        </div>
      </Link>
    </motion.article>
  )
}