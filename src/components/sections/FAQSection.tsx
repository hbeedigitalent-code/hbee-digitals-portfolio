'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

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

const trustCards = [
  {
    label: 'Clear Communication',
    icon: 'messages',
    description:
      'We keep the process simple, transparent, and easy to follow from audit to launch.',
  },
  {
    label: 'Fast Turnaround',
    icon: 'rocket',
    description:
      'Projects are structured with clear timelines, milestones, and focused execution.',
  },
  {
    label: 'Growth Focused',
    icon: 'growth',
    description:
      'Every recommendation is tied to trust, user experience, conversion, or long-term growth.',
  },
]

export default function FAQSection({ data, variant = 'home' }: FAQSectionProps) {
  const reducedMotion = useReducedMotion()
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [activeCategory, setActiveCategory] = useState('all')

  const sortedFaqs = useMemo(() => {
    return [...(data || [])].sort(
      (a, b) => (a.display_order || 0) - (b.display_order || 0)
    )
  }, [data])

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(sortedFaqs.map((faq) => faq.category?.trim()).filter(Boolean))
    ) as string[]

    return ['all', ...unique]
  }, [sortedFaqs])

  const filteredFaqs = useMemo(() => {
    if (activeCategory === 'all') return sortedFaqs

    return sortedFaqs.filter((faq) => faq.category?.trim() === activeCategory)
  }, [sortedFaqs, activeCategory])

  if (!sortedFaqs.length) return null

  const visibleFaqs = variant === 'home' ? filteredFaqs.slice(0, 5) : filteredFaqs

  return (
    <section className="relative overflow-hidden py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[#39D97A]/8 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[#C6F135]/7 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-[size:82px_82px] opacity-15" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr]">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -22 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="faq" size={14} color="#39D97A" />
              Questions & Answers
            </div>

            <h2 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl">
              Everything you need to <GradientHeading>know.</GradientHeading>
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-7 text-white/62 sm:text-base">
              Answers about our process, timelines, Shopify support, websites,
              digital growth systems, and how we help brands scale online.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {trustCards.map((item) => (
                <div
                  key={item.label}
                  className="group flex items-start gap-4 rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D]/92 p-4 transition duration-300 hover:border-[#39D97A]/25 hover:bg-[#13233A]"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                    <SvgIcon name={item.icon} size={20} color="#39D97A" />
                  </div>

                  <div>
                    <p className="text-sm font-black text-white">{item.label}</p>

                    <p className="mt-1 text-xs leading-5 text-white/45">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {variant === 'home' && (
              <Link
                href="/faq"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                View All FAQs
                <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
              </Link>
            )}
          </motion.div>

          <div>
            {variant === 'page' && categories.length > 1 && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-7 flex flex-wrap gap-3"
              >
                {categories.map((category) => {
                  const active = activeCategory === category

                  return (
                    <button
                      key={category}
                      onClick={() => {
                        setActiveCategory(category)
                        setOpenIndex(0)
                      }}
                      className={`rounded-full border px-5 py-2.5 text-sm font-bold capitalize transition ${
                        active
                          ? 'border-[#39D97A]/25 bg-[#39D97A]/10 text-[#39D97A]'
                          : 'border-[#1E314A] bg-[#0E1B2D] text-white/55 hover:border-[#39D97A]/20 hover:text-white'
                      }`}
                    >
                      {category === 'all' ? 'All FAQs' : category}
                    </button>
                  )
                })}
              </motion.div>
            )}

            <div className="space-y-4">
              {visibleFaqs.map((faq, index) => {
                const isOpen = openIndex === index

                return (
                  <motion.div
                    key={faq.id || index}
                    initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.42, delay: index * 0.04 }}
                    className={`overflow-hidden rounded-[1.7rem] border transition-all duration-300 ${
                      isOpen
                        ? 'border-[#39D97A]/22 bg-[#13233A]'
                        : 'border-[#1E314A] bg-[#0E1B2D]/92 hover:border-[#39D97A]/16 hover:bg-[#13233A]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="flex w-full items-start gap-5 p-5 text-left sm:p-6"
                    >
                      <div className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                        <SvgIcon name="faq" size={18} color="#39D97A" />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-lg font-black leading-snug text-white sm:text-xl">
                          {faq.question}
                        </h3>

                        {faq.category && (
                          <div className="mt-3 inline-flex items-center rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#39D97A]">
                            {faq.category}
                          </div>
                        )}
                      </div>

                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="mt-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#1E314A] bg-[#07111F]"
                      >
                        <SvgIcon name="chevron-down" size={14} color="#39D97A" />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="border-t border-[#1E314A] px-5 pb-6 pt-5 sm:px-6">
                            <div className="pl-0 sm:pl-16">
                              {faq.rich_answer ? (
                                <div
                                  className="prose prose-invert max-w-none prose-p:text-white/68 prose-p:leading-8 prose-strong:text-white prose-a:text-[#39D97A] prose-li:text-white/68"
                                  dangerouslySetInnerHTML={{
                                    __html: faq.rich_answer,
                                  }}
                                />
                              ) : (
                                <p className="text-sm leading-8 text-white/68 sm:text-base">
                                  {faq.answer}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>

            {variant === 'home' && sortedFaqs.length > 5 && (
              <div className="mt-8 text-center lg:hidden">
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-6 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
                >
                  See More Answers
                  <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}