'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface FAQ {
  id: string
  question: string
  answer: string
  rich_answer: string
  display_order: number
}

interface FAQSectionProps {
  data: FAQ[]
  title?: string
  subtitle?: string
}

export default function FAQSection({ data, title = "Frequently Asked Questions", subtitle = "Got questions? We've got answers" }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const displayFaqs = data?.slice(0, 3) || []

  if (!data || data.length === 0) return null

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">{title}</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
          <p className="text-lg text-white/70">{subtitle}</p>
        </motion.div>

        <div className="space-y-4">
          {displayFaqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-white/5 transition-colors duration-200 group"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${faq.id}`}
              >
                <span className="font-semibold text-white text-lg group-hover:text-[#007BFF] transition-colors">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex-shrink-0"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#007BFF]"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    id={`faq-answer-${faq.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-white/80 border-t border-white/10 pt-4 faq-rich-content">
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
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg border-2 border-[#007BFF] text-[#007BFF] hover:bg-[#007BFF] hover:text-white"
          >
            <span>View All FAQs</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}