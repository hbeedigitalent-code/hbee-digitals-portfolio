'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FAQSection from '@/components/sections/FAQSection'

interface FAQ {
  id: string
  question: string
  answer: string
  rich_answer?: string
  category?: string
  display_order?: number
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFaqs() {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      setFaqs(data || [])
      setLoading(false)
    }

    fetchFaqs()
  }, [])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-page)] pt-20">
        <FAQSection data={faqs} variant="page" />
      </main>
      <Footer />
    </>
  )
}