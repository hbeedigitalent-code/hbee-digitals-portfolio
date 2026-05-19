'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import SvgIcon from '@/components/ui/SvgIcon'

interface Category {
  id: string
  name: string
  slug: string
}

interface FAQ {
  id: string
  question: string
  answer: string
  rich_answer?: string
  category_id: string
  display_order: number
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

function FAQContent() {
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category')
  const reducedMotion = useReducedMotion()

  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategoryId, setActiveCategoryId] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: categoriesData } = await supabase
        .from('faq_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      const safeCategories = categoriesData || []
      setCategories(safeCategories)

      if (categorySlug) {
        const matchedCategory = safeCategories.find((category) => category.slug === categorySlug)
        setActiveCategoryId(matchedCategory?.id || 'all')
      } else {
        setActiveCategoryId('all')
      }

      const { data: faqsData } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      setFaqs(faqsData || [])
      setLoading(false)
    }

    fetchData()
  }, [categorySlug])

  const filteredFaqs =
    activeCategoryId === 'all'
      ? faqs
      : faqs.filter((faq) => faq.category_id === activeCategoryId)

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060E1C] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
          <p className="text-sm font-bold text-white/45">Loading FAQs...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative overflow-hidden bg-gradient-to-br from-[#060E1C] via-[#0B1E38] to-[#060E1C] text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/7 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
      </div>

      <section className="relative px-5 pb-10 pt-32 sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-4xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="faq" size={14} color="#39D97A" />
              FAQ Center
            </div>

            <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
              Clear answers for brands ready to{' '}
              <CurvedUnderlineText>move.</CurvedUnderlineText>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 md:text-lg">
              Browse questions by category and get clarity on our process, timelines, services,
              communication, pricing, and digital growth systems.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="relative px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="sticky top-24 z-20 mb-10 rounded-[1.5rem] border border-white/10 bg-[#060E1C]/80 p-3 backdrop-blur-2xl"
          >
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/faq"
                scroll={false}
                onClick={() => {
                  setActiveCategoryId('all')
                  setOpenId(null)
                }}
                className={`group relative overflow-hidden rounded-full border px-5 py-3 text-sm font-bold transition-all duration-300 ${
                  activeCategoryId === 'all'
                    ? 'border-[#39D97A]/35 bg-[#39D97A]/12 text-[#39D97A] shadow-[0_0_35px_rgba(57,217,122,0.18)]'
                    : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8 hover:text-white'
                }`}
              >
                All
              </Link>

              {categories.map((category) => {
                const active = activeCategoryId === category.id

                return (
                  <Link
                    key={category.id}
                    href={`/faq?category=${category.slug}`}
                    scroll={false}
                    onClick={() => {
                      setActiveCategoryId(category.id)
                      setOpenId(null)
                    }}
                    className={`group relative overflow-hidden rounded-full border px-5 py-3 text-sm font-bold transition-all duration-300 ${
                      active
                        ? 'border-[#39D97A]/35 bg-[#39D97A]/12 text-[#39D97A] shadow-[0_0_35px_rgba(57,217,122,0.18)]'
                        : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8 hover:text-white'
                    }`}
                  >
                    {category.name}
                  </Link>
                )
              })}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategoryId}
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {filteredFaqs.length === 0 ? (
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
                  <SvgIcon name="faq" size={46} color="#39D97A" className="mx-auto mb-4" />
                  <h3 className="text-lg font-black text-white">No FAQs in this category yet</h3>
                  <p className="mt-2 text-sm text-white/45">Check back soon for more information.</p>
                </div>
              ) : (
                filteredFaqs.map((faq, index) => {
                  const isOpen = openId === faq.id

                  return (
                    <motion.div
                      key={faq.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.035 }}
                      className={`group overflow-hidden rounded-[1.4rem] border backdrop-blur-xl transition duration-300 ${
                        isOpen
                          ? 'border-[#39D97A]/30 bg-[#39D97A]/10 shadow-[0_0_40px_rgba(57,217,122,0.1)]'
                          : 'border-white/10 bg-white/[0.04] hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : faq.id)}
                        className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left sm:px-6"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base font-black leading-6 tracking-[-0.025em] text-white transition group-hover:text-[#C6F135] sm:text-lg">
                          {faq.question}
                        </span>

                        <span
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition ${
                            isOpen
                              ? 'border-[#39D97A]/30 bg-[#39D97A]/14'
                              : 'border-white/10 bg-white/[0.04] group-hover:border-[#39D97A]/25'
                          }`}
                        >
                          <SvgIcon
                            name="arrow-diagonal"
                            size={15}
                            color={isOpen ? '#C6F135' : '#39D97A'}
                            className={`transition duration-300 ${isOpen ? 'rotate-90' : 'rotate-45'}`}
                          />
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-7 text-white/68 sm:px-6">
                              {faq.rich_answer ? (
                                <div dangerouslySetInnerHTML={{ __html: faq.rich_answer }} />
                              ) : (
                                <p>{faq.answer}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/85 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8">
            <h2 className="text-3xl font-black tracking-[-0.045em] text-white md:text-4xl">
              Still have <CurvedUnderlineText>questions?</CurvedUnderlineText>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Reach out and we’ll help you understand the best next step for your website, store, or brand.
            </p>

            <Link
              href="/contact"
              className="group mt-7 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02]"
            >
              Contact Us
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
  )
}

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-[#060E1C] text-white">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
          </main>
        }
      >
        <FAQContent />
      </Suspense>
      <Footer />
    </>
  )
}