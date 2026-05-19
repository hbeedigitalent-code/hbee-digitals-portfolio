'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
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

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75 sm:-bottom-3 sm:h-5"
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

function CategoryTile({
  category,
  isActive,
  onClick,
}: {
  category: Category
  isActive: boolean
  onClick: () => void
}) {
  const iconName = category.icon
    ?.replace('/icons/portfolio/', '')
    ?.replace('/svgs/', '')
    ?.replace('.svg', '') || 'systems'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
        isActive
          ? 'border-[#39D97A]/35 bg-[#39D97A]/12 text-[#39D97A] shadow-[0_0_28px_rgba(57,217,122,0.12)]'
          : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8 hover:text-white'
      }`}
    >
      <SvgIcon
        name={iconName}
        size={15}
        color={isActive ? '#39D97A' : 'rgba(248,250,252,0.55)'}
      />
      {category.label}
    </button>
  )
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const fetchItems = async () => {
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
    return items.filter((item) => item.category === activeCategory)
  }, [activeCategory, items])

  const allCategories = categories.filter((category) => category.id !== 'all')
  const featuredItem = items.find((item) => item.featured) || items[0]

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#060E1C] text-white">
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

      <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#060E1C] via-[#0B1E38] to-[#060E1C] text-white">
        <div className="absolute inset-0 -z-0">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/7 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        </div>

        <section className="relative z-10 px-5 pb-10 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]"
                >
                  <SvgIcon name="portfolio" size={14} color="#39D97A" />
                  Portfolio / Case Studies
                </motion.div>

                <motion.h1
                  initial={reducedMotion ? false : { opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.08 }}
                  className="max-w-5xl text-5xl font-black leading-[0.94] tracking-[-0.065em] sm:text-6xl lg:text-7xl"
                >
                  Real Stores.
                  <br />
                  Real <CurvedUnderlineText>Results.</CurvedUnderlineText>
                </motion.h1>

                <motion.p
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.16 }}
                  className="mt-6 max-w-2xl text-base leading-8 text-white/62 md:text-lg"
                >
                  Explore selected Shopify, e-commerce, and digital growth projects built to improve
                  trust, conversion, performance, and brand authority.
                </motion.p>
              </div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.18 }}
                className="grid gap-3 sm:grid-cols-3"
              >
                {[
                  { label: 'Growth Systems', icon: 'growth' },
                  { label: 'Conversion UX', icon: 'conversion' },
                  { label: 'Premium Builds', icon: 'precision' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                  >
                    <SvgIcon name={item.icon} size={20} color="#39D97A" className="mb-3" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                      {item.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            {featuredItem && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.26 }}
                className="mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/85 shadow-[0_35px_110px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
              >
                <div className="grid lg:grid-cols-[1.12fr_0.88fr]">
                  <div className="relative h-[280px] overflow-hidden sm:h-[380px] lg:h-auto">
                    {featuredItem.image_url ? (
                      <img
                        src={featuredItem.image_url}
                        alt={featuredItem.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B1E38] to-[#132847]">
                        <SvgIcon name="analytics" size={70} color="#39D97A" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#071427]" />
                  </div>

                  <div className="relative p-6 sm:p-8 lg:p-10">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.18),transparent_42%)]" />

                    <div className="relative">
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A]">
                        Featured Case Study
                      </div>

                      <h2 className="text-3xl font-black leading-tight tracking-[-0.045em] text-white sm:text-4xl">
                        {featuredItem.name}
                      </h2>

                      <p className="mt-4 text-sm leading-7 text-white/62 sm:text-base">
                        {featuredItem.description ||
                          'A selected digital growth project focused on improving brand trust, user flow, conversion structure, and scalable presentation.'}
                      </p>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                          { label: featuredItem.tag || 'Project', icon: 'systems' },
                          { label: featuredItem.result || 'Growth Focus', icon: 'analytics' },
                          { label: featuredItem.category || 'Case Study', icon: 'portfolio' },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <SvgIcon name={item.icon} size={18} color="#39D97A" className="mb-3" />
                            <p className="text-[11px] font-bold text-white/62">{item.label}</p>
                          </div>
                        ))}
                      </div>

                      <Link
                        href={featuredItem.url || '/contact'}
                        className="group mt-7 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02]"
                      >
                        View Featured Project
                        <SvgIcon
                          name="arrow-diagonal"
                          size={16}
                          color="#06101F"
                          className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        <section className="relative z-10 px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="sticky top-24 z-20 mb-10 rounded-[1.5rem] border border-white/10 bg-[#060E1C]/80 p-3 backdrop-blur-2xl">
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory('all')}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    activeCategory === 'all'
                      ? 'border-[#39D97A]/35 bg-[#39D97A]/12 text-[#39D97A]'
                      : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-[#39D97A]/25 hover:text-white'
                  }`}
                >
                  <SvgIcon
                    name="portfolio"
                    size={15}
                    color={activeCategory === 'all' ? '#39D97A' : 'rgba(248,250,252,0.55)'}
                  />
                  All
                </button>

                {allCategories.map((category) => (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    isActive={activeCategory === category.id}
                    onClick={() => setActiveCategory(category.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-white/45">
                Showing <span className="text-[#39D97A]">{filteredItems.length}</span> projects
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                {filteredItems.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map((item, index) => (
                      <motion.article
                        key={item.id}
                        initial={reducedMotion ? false : { opacity: 0, y: 26 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: index * 0.05 }}
                        viewport={{ once: true }}
                        className="group/card overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#08182D] shadow-[0_28px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/30"
                      >
                        <Link href={item.url || '/contact'}>
                          <div className="relative h-56 overflow-hidden bg-[#0B1E38]">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-cover transition duration-700 group-hover/card:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0B1E38] to-[#132847]">
                                <SvgIcon name="analytics" size={58} color="#39D97A" />
                              </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C] via-[#060E1C]/35 to-transparent" />

                            <div className="absolute left-4 top-4 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A] backdrop-blur-xl">
                              {item.tag || 'Project'}
                            </div>

                            {item.result && (
                              <div className="absolute bottom-4 left-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white/75 backdrop-blur-xl">
                                <SvgIcon name="analytics" size={14} color="#C6F135" />
                                {item.result}
                              </div>
                            )}
                          </div>

                          <div className="relative overflow-hidden p-5">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.22),transparent_42%),linear-gradient(135deg,rgba(57,217,122,0.12),rgba(198,241,53,0.04)_38%,rgba(6,14,28,0)_75%)] opacity-90" />
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

                            <div className="relative">
                              <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[#C6F135]/80">
                                <SvgIcon name="precision" size={16} color="#39D97A" />
                                Digital growth system
                              </div>

                              <h3 className="text-xl font-black leading-tight tracking-[-0.035em] text-white">
                                {item.name}
                              </h3>

                              {item.description && (
                                <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/55">
                                  {item.description}
                                </p>
                              )}

                              <div className="mt-5 grid grid-cols-3 gap-2">
                                {['Problem', 'System', 'Result'].map((label) => (
                                  <div
                                    key={label}
                                    className="rounded-2xl border border-[#39D97A]/16 bg-[#39D97A]/8 px-3 py-2 text-center text-[11px] font-bold text-white/70"
                                  >
                                    {label}
                                  </div>
                                ))}
                              </div>

                              <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#39D97A] transition group-hover/card:text-[#C6F135]">
                                View Case Study
                                <SvgIcon
                                  name="arrow-diagonal"
                                  size={16}
                                  color="#39D97A"
                                  className="transition group-hover/card:translate-x-1 group-hover/card:-translate-y-1"
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
                    <SvgIcon name="portfolio" size={46} color="#39D97A" className="mx-auto mb-4" />
                    <h3 className="text-lg font-black text-white">No projects yet</h3>
                    <p className="mt-2 text-sm text-white/45">
                      Check back soon for new portfolio items.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/85 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8">
              <h2 className="text-3xl font-black tracking-[-0.045em] text-white md:text-4xl">
                Want results like <CurvedUnderlineText>these?</CurvedUnderlineText>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Every project starts with understanding what is broken, what needs to improve, and
                what growth system will move the brand forward.
              </p>

              <Link
                href="/contact"
                className="group mt-7 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02]"
              >
                Start Your Project
                <SvgIcon
                  name="arrow-diagonal"
                  size={16}
                  color="#06101F"
                  className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}