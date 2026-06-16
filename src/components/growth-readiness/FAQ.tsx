'use client'

import { useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    question: 'What is the Hbee Growth Readiness Assessment™?',
    answer: 'It\'s a comprehensive evaluation tool that assesses your business across 5 critical growth pillars: Visibility, Conversion, Retention, Authority, and Scalability. You\'ll receive a personalized Growth Readiness Index (HGRI™) score and growth profile.'
  },
  {
    question: 'How long does the assessment take?',
    answer: 'The assessment typically takes 5–7 minutes to complete. It consists of 7 sections with straightforward questions about your business.'
  },
  {
    question: 'What happens after I complete the assessment?',
    answer: 'You\'ll receive your HGRI™ score and growth profile. Our team will review your submission and you may be considered for additional growth support and partnership opportunities.'
  },
  {
    question: 'Is the assessment free?',
    answer: 'Yes, the Hbee Growth Readiness Assessment™ is completely free. We believe in providing value and identifying growth opportunities for ecommerce businesses.'
  },
  {
    question: 'What do I need to prepare?',
    answer: 'No preparation needed! Just answer the questions honestly based on your current business situation. Having your website URL and basic business information ready will help.'
  },
  {
    question: 'Will my data be kept private?',
    answer: 'Absolutely. Your data is protected and will only be used to generate your growth profile and assess your fit for partnership opportunities. We never share your information with third parties.'
  }
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="section section-dark">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="faq" size={16} />
            FAQ
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading section-heading-dark mb-12"
          >
            Frequently Asked Questions
          </motion.h2>
        </div>

        <div className="mx-auto max-w-3xl">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-[var(--bg-card-hover)]"
              >
                <span className="font-semibold text-white">{faq.question}</span>
                <span className="ml-4 flex-shrink-0">
                  <SvgIcon 
                    name={openIndex === index ? 'minus' : 'plus'} 
                    size={20} 
                    color="var(--accent-orange)" 
                  />
                </span>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[var(--border)] p-6">
                      <p className="text-[var(--text-on-dark-muted)]">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}