'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface FAQ {
  id: string
  question: string
  answer: string
  rich_answer?: string
  category?: string
  display_order?: number
}

interface FAQSectionProps {
  faqs?: FAQ[]
  variant?: 'home' | 'page'
  title?: string
  subtitle?: string
  limit?: number
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function FAQSection({ 
  faqs = [],
  variant = 'home', 
  title = "Everything You Need to Know", 
  subtitle = "Clear answers about our ecommerce, branding, website, content, and growth support services.",
  limit = 6
}: FAQSectionProps) {
  const reducedMotion = useReducedMotion()
  const [openId, setOpenId] = useState<string | null>(null)

  // Ensure faqs is an array before processing
  const faqsArray = Array.isArray(faqs) ? faqs : []

  // Sort FAQs by display_order
  const sortedFaqs = useMemo(() => {
    return [...faqsArray].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  }, [faqsArray])

  // Limit FAQs for homepage
  const displayFaqs = variant === 'home' ? sortedFaqs.slice(0, limit) : sortedFaqs

  // Split into two columns for desktop
  const midPoint = Math.ceil(displayFaqs.length / 2)
  const leftColumnFaqs = displayFaqs.slice(0, midPoint)
  const rightColumnFaqs = displayFaqs.slice(midPoint)

  const handleToggle = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  if (!displayFaqs.length) return null

  return (
    <section className="relative overflow-hidden bg-[var(--bg-section)] py-16 md:py-20 lg:py-24">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/5 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[var(--accent-lime)]/5 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-6 md:px-8">
        {/* Section Header - Only show if title is provided */}
        {title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
              <span className="text-xs font-semibold text-[var(--accent)]">FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">
              {title}
            </h2>
            <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto">
              {subtitle}
            </p>
          </motion.div>
        )}

        {/* FAQ Grid - Two Columns */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-5 md:grid-cols-2 md:gap-6"
        >
          {/* Left Column */}
          <div className="space-y-4 md:space-y-5">
            {leftColumnFaqs.map((faq) => {
              const isOpen = openId === faq.id

              return (
                <motion.div
                  key={faq.id}
                  variants={itemVariants}
                  className={`rounded-xl border transition-all duration-300 ${
                    isOpen
                      ? 'border-[var(--accent)]/40 bg-[var(--bg-card)] shadow-[0_0_30px_rgba(57,217,122,0.08)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)]/50 hover:border-[var(--accent)]/20 hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <button
                    onClick={() => handleToggle(faq.id)}
                    className="w-full text-left px-5 py-4 md:px-6 md:py-5"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={`text-base md:text-lg font-semibold transition-colors ${
                        isOpen ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'
                      }`}>
                        {faq.question}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="flex-shrink-0 mt-1"
                      >
                        <SvgIcon name="chevron-down" size={20} color={isOpen ? 'var(--accent)' : 'var(--text-muted)'} />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 md:px-6 md:pb-6">
                          <div className="pt-4 border-t border-[var(--border)]">
                            {faq.rich_answer ? (
                              <div
                                className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: faq.rich_answer }}
                              />
                            ) : (
                              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
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

          {/* Right Column */}
          <div className="space-y-4 md:space-y-5">
            {rightColumnFaqs.map((faq) => {
              const isOpen = openId === faq.id

              return (
                <motion.div
                  key={faq.id}
                  variants={itemVariants}
                  className={`rounded-xl border transition-all duration-300 ${
                    isOpen
                      ? 'border-[var(--accent)]/40 bg-[var(--bg-card)] shadow-[0_0_30px_rgba(57,217,122,0.08)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)]/50 hover:border-[var(--accent)]/20 hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <button
                    onClick={() => handleToggle(faq.id)}
                    className="w-full text-left px-5 py-4 md:px-6 md:py-5"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className={`text-base md:text-lg font-semibold transition-colors ${
                        isOpen ? 'text-[var(--accent)]' : 'text-[var(--text-primary)] group-hover:text-[var(--accent)]'
                      }`}>
                        {faq.question}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="flex-shrink-0 mt-1"
                      >
                        <SvgIcon name="chevron-down" size={20} color={isOpen ? 'var(--accent)' : 'var(--text-muted)'} />
                      </motion.div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 md:px-6 md:pb-6">
                          <div className="pt-4 border-t border-[var(--border)]">
                            {faq.rich_answer ? (
                              <div
                                className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: faq.rich_answer }}
                              />
                            ) : (
                              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
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
        </motion.div>

        {/* View All Button - Only on homepage */}
        {variant === 'home' && sortedFaqs.length > limit && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center mt-12"
          >
            <Button
              href="/faq"
              variant="secondary"
              size="lg"
              icon={
                <SvgIcon name="arrow-right" size={14} color="var(--accent)" />
              }
              iconPosition="right"
            >
              View All FAQs
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  )
}