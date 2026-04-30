'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Category {
  id: string
  name: string
  slug: string
}

interface FAQ {
  id: string
  question: string
  answer: string
  rich_answer: string
  category_id: string
  display_order: number
}

// Component that uses useSearchParams - wrapped in Suspense
function FAQContent() {
  const searchParams = useSearchParams()
  const categorySlug = searchParams.get('category')
  
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('faq_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      setCategories(categoriesData || [])
      
      // If category slug in URL, set active category
      if (categorySlug && categoriesData) {
        const matchedCategory = categoriesData.find(c => c.slug === categorySlug)
        if (matchedCategory) {
          setActiveCategoryId(matchedCategory.id)
        }
      }
      
      // Fetch FAQs
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

  const filteredFaqs = activeCategoryId === 'all'
    ? faqs
    : faqs.filter(faq => faq.category_id === activeCategoryId)

  if (loading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#007BFF]" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase text-white mb-4" style={{ backgroundColor: 'var(--primary-color)' }}>
          FAQ
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
          Frequently Asked Questions
        </h1>
        <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
        <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
          Find answers to common questions about our services, process, and pricing.
        </p>
      </motion.div>

      {/* Category Pills with Slug URLs */}
      {categories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          <Link
            href="/faq"
            scroll={false}
            onClick={() => { setActiveCategoryId('all'); setOpenId(null); }}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeCategoryId === 'all'
                ? 'text-white shadow-md'
                : 'text-gray-600 bg-white border border-gray-200 hover:border-[#007BFF] hover:text-[#007BFF]'
            }`}
            style={activeCategoryId === 'all' ? { backgroundColor: 'var(--primary-color)' } : {}}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/faq?category=${cat.slug}`}
              scroll={false}
              onClick={() => { setActiveCategoryId(cat.id); setOpenId(null); }}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeCategoryId === cat.id
                  ? 'text-white shadow-md'
                  : 'text-gray-600 bg-white border border-gray-200 hover:border-[#007BFF] hover:text-[#007BFF]'
              }`}
              style={activeCategoryId === cat.id ? { backgroundColor: 'var(--primary-color)' } : {}}
            >
              {cat.name}
            </Link>
          ))}
        </motion.div>
      )}

      {/* FAQ Items */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">📖</div>
            <p className="text-gray-400">No FAQs in this category yet.</p>
            <p className="text-sm text-gray-300 mt-1">Check back soon for more information.</p>
          </motion.div>
        ) : (
          filteredFaqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-md transition-all duration-300"
            >
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 group"
              >
                <span className="font-medium text-gray-800 group-hover:text-[#007BFF] transition-colors">
                  {faq.question}
                </span>
                <motion.svg
                  animate={{ rotate: openId === faq.id ? 180 : 0 }}
                  className="w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-[#007BFF] transition-colors"
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
                      <div className="border-t border-gray-100 pt-4"></div>
                      <div className="text-gray-600 text-sm leading-relaxed faq-rich-content">
                        {faq.rich_answer ? (
                          <div dangerouslySetInnerHTML={{ __html: faq.rich_answer }} />
                        ) : (
                          <p>{faq.answer}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mt-16 p-10 rounded-2xl bg-gradient-to-r from-[#007BFF]/10 to-[#00BFFF]/5 border border-[#007BFF]/20"
      >
        <h3 className="text-xl font-bold text-gray-800 mb-2">Still have questions?</h3>
        <p className="text-gray-600 mb-6 text-sm">We're here to help. Reach out to our team anytime.</p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-300"
        >
          Contact Us
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </motion.div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-gray-50">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#007BFF]" />
          </div>
        }>
          <FAQContent />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}