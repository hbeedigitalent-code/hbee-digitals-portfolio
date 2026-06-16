// src/app/assessment/thank-you/page.tsx
// Server Component - No 'use client' needed

import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

export const metadata = {
  title: 'Assessment Received | Hbee Digitals',
  description: 'Thank you for completing the Hbee Growth Readiness Assessment™. Your growth profile is being prepared.',
}

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] py-20 md:py-32">
      <div className="container-custom">
        <div className="mx-auto max-w-2xl text-center">
          {/* Success Icon */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-[var(--accent-lime)]/10 p-6">
              <SvgIcon name="check" size={64} color="var(--accent-lime)" />
            </div>
          </div>

          <h1 className="section-heading section-heading-dark mb-4">
            Assessment Received ✓
          </h1>
          
          <p className="section-description section-description-dark mx-auto mb-6">
            Thank you for completing the Hbee Growth Readiness Assessment™.
          </p>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6 md:p-8 text-left">
            <p className="text-[var(--text-on-dark-muted)]">
              Your submission has been received by the Hbee Review Team.
              Your Growth Profile is now being prepared.
            </p>
            <p className="mt-2 text-sm text-[var(--accent-orange)] font-semibold">
              Estimated review time: 2–5 business days
            </p>
          </div>

          <div className="mt-8 text-left">
            <h3 className="mb-3 font-semibold text-white">Next Steps:</h3>
            <ul className="space-y-2 text-[var(--text-on-dark-muted)]">
              <li className="flex items-start gap-3">
                <span className="mt-1 text-[var(--accent-lime)]">1.</span>
                <span>Submission Review by our growth team</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-[var(--accent-lime)]">2.</span>
                <span>Growth Profile Generation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-[var(--accent-lime)]">3.</span>
                <span>Opportunity Evaluation</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 text-[var(--accent-lime)]">4.</span>
                <span>Support Eligibility Assessment</span>
              </li>
            </ul>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/growth-readiness"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--bg-card-hover)] hover:transform hover:-translate-y-0.5"
            >
              Return to Growth Readiness
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[var(--orange-600)] hover:transform hover:-translate-y-0.5"
            >
              Visit Homepage
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}