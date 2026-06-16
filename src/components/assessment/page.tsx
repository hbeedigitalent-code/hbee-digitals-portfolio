// src/app/assessment/page.tsx
// Server Component - No 'use client' needed

import { AssessmentForm } from '@/components/assessment/AssessmentForm'

export const metadata = {
  title: 'Growth Readiness Assessment | Hbee Digitals',
  description: 'Complete the Hbee Growth Readiness Assessment™. Get your HGRI™ score and growth profile in 5-7 minutes.',
  openGraph: {
    title: 'Hbee Growth Readiness Assessment™',
    description: 'Complete the assessment and discover your growth potential.',
    url: 'https://www.hbeedigitals.com/assessment',
  }
}

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] py-12 md:py-20">
      <div className="container-custom">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="section-heading section-heading-dark mb-2">
              Growth Readiness Assessment
            </h1>
            <p className="section-description section-description-dark mx-auto">
              Answer 7 simple sections about your business. Takes just 5–7 minutes.
            </p>
          </div>

          <AssessmentForm />
        </div>
      </div>
    </main>
  )
}