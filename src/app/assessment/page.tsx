// src/app/assessment/page.tsx
'use client'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { AssessmentForm } from '@/components/assessment/AssessmentForm'

export default function AssessmentPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-navy)] py-12 md:py-20">
        <div className="container-custom">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Growth Readiness Assessment
              </h1>
              <p className="text-[var(--text-on-dark-muted)] text-base md:text-lg">
                Answer simple questions about your business. Takes just 5–7 minutes.
              </p>
            </div>

            <AssessmentForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}