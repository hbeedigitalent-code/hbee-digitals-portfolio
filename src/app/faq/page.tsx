'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Category {
  id: string
  name: string
  display_order: number
}

interface FAQ {
  id: string
  question: string
  answer: string
  category_id: string
  display_order: number
}

export default function FAQPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from('faq_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
        
        setCategories(categoriesData || [])
        
        if (categoriesData && categoriesData.length > 0) {
          setActiveCategoryId(categoriesData[0].id)
        }
        
        // Fetch FAQs
        const { data: faqsData } = await supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
        
        setFaqs(faqsData || [])
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const filteredFaqs = faqs.filter(faq => faq.category_id === activeCategoryId)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading FAQs...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      
      <main className="pt-32 pb-20 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header with animation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
              Frequently Asked Questions
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions about our services, process, and pricing.
              Can't find what you're looking for? Contact us directly.
            </p>
          </motion.div>

          {/* Category Tabs with animation */}
          {categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap justify-center gap-2 mb-12"
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setActiveCategoryId(category.id)
                    setOpenIndex(null)
                  }}
                  className={`px-6 py-2 rounded-full transition-all duration-300 ${
                    activeCategoryId === category.id
                      ? 'text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={{
                    backgroundColor: activeCategoryId === category.id ? 'var(--primary-color)' : undefined
                  }}
                >
                  {category.name}
                </button>
              ))}
            </motion.div>
          )}

          {/* FAQ Accordion with animations */}
          <div className="max-w-3xl mx-auto">
            {filteredFaqs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-white rounded-lg shadow"
              >
                <p className="text-gray-500">No FAQs found in this category yet.</p>
                <p className="text-gray-400 text-sm mt-2">Check back soon for more information.</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-300"
                  >
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors duration-200 group"
                    >
                      <span className="font-semibold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">
                        {faq.question}
                      </span>
                      
                      {/* Animated Chevron Icon */}
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
                          style={{ color: 'var(--primary-color)' }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </motion.div>
                    </button>
                    
                    {/* Animated Answer */}
                    <AnimatePresence>
                      {openIndex === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 text-gray-600 border-t pt-4">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom CTA with animation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center mt-12 pt-8 border-t"
          >
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--primary-color)' }}>
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-4">
              Can't find the answer you're looking for? Our team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="px-6 py-2 text-white rounded-lg transition-all duration-300 hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Contact Us
              </Link>
              <Link
                href="tel:+2349121913997"
                className="px-6 py-2 border-2 rounded-lg transition-all duration-300 hover:bg-gray-100"
                style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
              >
                Call Now
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  )
}