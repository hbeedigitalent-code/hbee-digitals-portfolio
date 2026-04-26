'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function FAQPage() {
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">Loading FAQs...</div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold text-center mb-12">Frequently Asked Questions</h1>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={faq.id} className="bg-white rounded-lg border p-4">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full text-left flex justify-between items-center"
                >
                  <span className="font-semibold">{faq.question}</span>
                  <span>{openIndex === index ? '−' : '+'}</span>
                </button>
                {openIndex === index && (
                  <div className="mt-3 pt-3 border-t text-gray-600">{faq.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}