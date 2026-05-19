'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface FAQ {
  id: string
  question: string
  answer: string
  rich_answer?: string
  category?: string
  display_order?: number
}

interface FAQSectionProps {
  data: FAQ[]
  variant?: 'home' | 'page'
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

export default function FAQSection({ data, variant = 'home' }: FAQSectionProps) {
  const reducedMotion = useReducedMotion()
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        (data || [])
          .map((faq) => faq.category?.trim())
          .filter(Boolean)
      )
    ) as string[]

    return ['all', ...unique]
  }, [data])

  const filteredFaqs = useMemo(() => {
    if (activeCategory === 'all') return data || []
    return (data || []).filter((faq) => faq.category?.trim() === activeCategory)
  }, [data, activeCategory])

  if (!data || data.length === 0) return null

  const visibleFaqs = variant === 'home' ? data.slice(0, 6) : filteredFaqs

  return (
    <section className="relative overflow-hidden py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[#39D97A]/8 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[#C6F135]/7 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        {variant === 'home' ? (
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
              viewport={{ once: true }}
              className="lg:sticky lg:top-28"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="faq" size={14} color="#39D97A" />
                Questions & Answers
              </div>

              <h2 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl">
                Got questions?
                <br />
                We’ve got <CurvedUnderlineText>answers.</CurvedUnderlineText>
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-white/62 sm:text-base">
                A quick look at how we work, what we help with, and what to expect before starting a project.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { label: 'Clear Process', icon: 'strategy' },
                  { label: 'Fast Response', icon: 'chat' },
                  { label: 'Growth Support', icon: 'growth' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8"
                  >
                    <SvgIcon name={item.icon} size={20} color="#39D97A" className="mb-3" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex justify-center lg:justify-start">
                <Link
                  href="/faq"
                  className="group inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[#39D97A]/18 bg-gradient-to-r from-[#39D97A]/14 to-[#C6F135]/8 px-7 py-3 text-sm font-black text-[#39D97A] transition-all duration-300 hover:scale-[1.02] hover:border-[#39D97A]/35 hover:text-[#C6F135]"
                >
                  View All FAQs
                  <SvgIcon
                    name="arrow-diagonal"
                    size={16}
                    color="#39D97A"
                    className="transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  />
                </Link>
              </div>
            </motion.div>

            <FAQList faqs={visibleFaqs} openIndex={openIndex} setOpenIndex={setOpenIndex} />
          </div>
        ) : (
          <>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="sticky top-24 z-20 mb-10 rounded-[1.5rem] border border-white/10 bg-[#060E1C]/80 p-3 backdrop-blur-2xl"
            >
              <div className="flex flex-wrap justify-center gap-3">
                {categories.map((category) => {
                  const active = activeCategory === category

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setActiveCategory(category)
                        setOpenIndex(0)
                      }}
                      className={`group relative overflow-hidden rounded-full border px-5 py-3 text-sm font-bold capitalize transition-all duration-300 ${
                        active
                          ? 'border-[#39D97A]/35 bg-[#39D97A]/12 text-[#39D97A] shadow-[0_0_35px_rgba(57,217,122,0.18)]'
                          : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8 hover:text-white'
                      }`}
                    >
                      <span className="relative z-10">
                        {category === 'all' ? 'All' : category}
                      </span>

                      {active && (
                        <motion.span
                          layoutId="faq-category-pill"
                          className="absolute inset-0 rounded-full border border-[#39D97A]/30"
                          transition={{
                            type: 'spring',
                            stiffness: 260,
                            damping: 24,
                          }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <FAQList faqs={visibleFaqs} openIndex={openIndex} setOpenIndex={setOpenIndex} />
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  )
}

function FAQList({
  faqs,
  openIndex,
  setOpenIndex,
}: {
  faqs: FAQ[]
  openIndex: number | null
  setOpenIndex: (index: number | null) => void
}) {
  const reducedMotion = useReducedMotion()

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index

        return (
          <motion.div
            key={faq.id}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            viewport={{ once: true }}
            className={`group overflow-hidden rounded-[1.4rem] border backdrop-blur-xl transition duration-300 ${
              isOpen
                ? 'border-[#39D97A]/30 bg-[#39D97A]/10 shadow-[0_0_40px_rgba(57,217,122,0.1)]'
                : 'border-white/10 bg-white/[0.04] hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
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
                      faq.answer
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}