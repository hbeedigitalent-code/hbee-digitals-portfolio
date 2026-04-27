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
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchFaqs = async () => {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      setFaqs(data || [])
      setLoading(false)
    }
    fetchFaqs()
  }, [])

  const categories = ['All', ...Array.from(new Set(faqs.map(f => f.category || 'General')))]

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'All' || (faq.category || 'General') === activeCategory
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2" style={{ borderColor: 'var(--primary-color)' }} />
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>FAQ</span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Find answers to common questions about our services, process, and pricing. Can't find what you're looking for? Contact us directly.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
            <div className="relative max-w-md mx-auto">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Search questions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:outline-none text-sm" style={{ ringColor: 'var(--primary-color)' }} />
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((cat, i) => (
              <button key={i} onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat ? 'text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
                style={activeCategory === cat ? { backgroundColor: 'var(--primary-color)' } : {}}>
                {cat}
              </button>
            ))}
          </motion.div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No FAQs found matching your criteria</p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => (
                <motion.div key={faq.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl border overflow-hidden transition-all duration-300 ${
                    openIndex === index ? 'shadow-lg border-blue-200' : 'hover:shadow-md border-gray-100'
                  }`}>
                  <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full text-left p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        openIndex === index ? 'text-white' : 'bg-gray-100 text-gray-500'
                      }`} style={openIndex === index ? { backgroundColor: 'var(--primary-color)' } : {}}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-900 text-base lg:text-lg">{faq.question}</span>
                    </div>
                    <svg className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''} ${openIndex === index ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="px-5 pb-5 pt-0 border-t mx-5">
                          <p className="text-gray-600 leading-relaxed pt-4">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>

          {/* Still have questions? */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mt-16 py-10 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800">
            <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
            <p className="text-white/70 mb-6">We're here to help. Reach out to our team anytime.</p>
            <a href="/contact" className="inline-flex items-center gap-2 px-8 py-3 bg-white rounded-xl font-semibold text-gray-900 hover:shadow-lg transition">
              Contact Us
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </a>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}