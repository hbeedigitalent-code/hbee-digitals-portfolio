'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'

interface FAQ {
  id: string
  question: string
  answer: string
  category?: string
  is_active: boolean
  display_order: number
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    const fetchFaqs = async () => {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      const faqData = data || []
      setFaqs(faqData)
      
      // Extract unique categories from the data
      const cats = Array.from(new Set(faqData.filter((f: FAQ) => f.category).map((f: FAQ) => f.category as string)))
      setCategories(cats.length > 0 ? cats : ['General', 'Services', 'Pricing', 'Process'])
      
      setLoading(false)
    }
    fetchFaqs()
  }, [])

  const filteredFaqs = activeCategory === 'All'
    ? faqs
    : faqs.filter(faq => (faq.category || 'General') === activeCategory)

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary-color)' }} />
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase text-white mb-4" style={{ backgroundColor: 'var(--primary-color)' }}>
              FAQ
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
              Find answers to common questions about our services, process, and pricing. Can't find what you're looking for? Contact us directly.
            </p>
          </motion.div>

          {/* Category Pills - Synced from DB */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap justify-center gap-2 mb-12">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => { setActiveCategory('All'); setOpenId(null); }}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategory === 'All'
                  ? 'text-white shadow-lg'
                  : 'text-gray-500 bg-gray-100 hover:text-white hover:shadow-md'
              }`}
              style={activeCategory === 'All' ? { backgroundColor: 'var(--primary-color)' } : {}}
              onMouseEnter={(e) => {
                if (activeCategory !== 'All') (e.target as HTMLElement).style.backgroundColor = 'var(--primary-color)'
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== 'All') (e.target as HTMLElement).style.backgroundColor = ''
              }}
            >
              All
            </motion.button>
            {categories.map((cat, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => { setActiveCategory(cat); setOpenId(null); }}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === cat
                    ? 'text-white shadow-lg'
                    : 'text-gray-500 bg-gray-100 hover:text-white hover:shadow-md'
                }`}
                style={activeCategory === cat ? { backgroundColor: 'var(--primary-color)' } : {}}
                onMouseEnter={(e) => {
                  if (activeCategory !== cat) (e.target as HTMLElement).style.backgroundColor = 'var(--primary-color)'
                }}
                onMouseLeave={(e) => {
                  if (activeCategory !== cat) (e.target as HTMLElement).style.backgroundColor = ''
                }}
              >
                {cat}
              </motion.button>
            ))}
          </motion.div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-gray-400">
                <svg className="w-14 h-14 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No FAQs in this category yet.</p>
              </motion.div>
            ) : (
              filteredFaqs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`rounded-2xl border transition-all duration-300 ${
                    openId === faq.id
                      ? 'border-gray-300 shadow-md bg-gray-50'
                      : 'border-gray-100 hover:border-gray-300 hover:shadow-sm bg-white'
                  }`}
                >
                  <button
                    onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all duration-300 group-hover:scale-110 ${
                          openId === faq.id ? 'text-white' : 'bg-gray-100 text-gray-500 group-hover:text-white'
                        }`}
                        style={openId === faq.id ? { backgroundColor: 'var(--primary-color)' } : {}}
                        onMouseEnter={(e) => {
                          if (openId !== faq.id) (e.target as HTMLElement).style.backgroundColor = 'var(--primary-color)'
                        }}
                        onMouseLeave={(e) => {
                          if (openId !== faq.id) (e.target as HTMLElement).style.backgroundColor = ''
                        }}
                      >
                        {openId === faq.id ? '−' : '+'}
                      </span>
                      <span className={`font-medium text-sm sm:text-base transition-colors duration-300 group-hover:text-blue-600 ${
                        openId === faq.id ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {faq.question}
                      </span>
                    </div>
                    <motion.svg
                      animate={{ rotate: openId === faq.id ? 180 : 0 }}
                      className="w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </button>
                  <AnimatePresence>
                    {openId === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <div className="border-t border-gray-200 pt-4"></div>
                          <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>

          {/* Bottom CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-16 p-10 rounded-2xl bg-gray-900">
            <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
            <p className="text-white/60 mb-6 text-sm">We're here to help. Reach out to our team anytime.</p>
            <a href="/contact" className="inline-flex items-center gap-2 px-8 py-3 bg-white rounded-full font-semibold text-sm text-gray-900 hover:bg-gray-100 transition">
              Contact Us
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}