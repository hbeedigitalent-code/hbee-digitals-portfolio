// src/app/assessment/thank-you/page.tsx
'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

export default function ThankYouPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-page)] py-20 md:py-32">
        <div className="container-custom">
          <div className="mx-auto max-w-2xl text-center">
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, type: 'spring', bounce: 0.5 }}
              className="mb-8 flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[var(--accent-lime)]/20 blur-2xl" />
                <div className="relative rounded-full bg-[var(--accent-lime)]/10 p-6">
                  <motion.div
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <SvgIcon name="check" size={64} color="var(--accent-lime)" />
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4"
            >
              Assessment Received ✓
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[var(--text-secondary)] text-lg mb-6"
            >
              Thank you for completing the Hbee Growth Readiness Assessment™.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8 text-left shadow-[var(--shadow-md)]"
            >
              <p className="text-[var(--text-secondary)]">
                Your submission has been received by the Hbee Review Team.
                Your Growth Profile is now being prepared.
              </p>
              <p className="mt-2 text-sm text-[var(--accent-orange)] font-semibold">
                Estimated review time: <span className="text-[var(--text-primary)]">12–48 hours</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 text-left"
            >
              <h3 className="mb-3 font-bold text-[var(--text-primary)] text-lg">Next Steps:</h3>
              <ul className="space-y-3 text-[var(--text-secondary)]">
                {[
                  'Submission Review by our growth team',
                  'Growth Profile Generation',
                  'Opportunity Evaluation',
                  'Support Eligibility Assessment'
                ].map((step, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-1 text-[var(--accent-lime)] font-bold">{index + 1}.</span>
                    <span>{step}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center"
            >
              <Link
                href="/growth-readiness"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-section)] hover:border-[var(--accent)]/30"
              >
                <SvgIcon name="chevron-left" size={16} color="var(--text-primary)" />
                Return to Growth Readiness
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--orange-600)] hover:scale-[1.02]"
              >
                Visit Homepage
                <SvgIcon name="arrow-right" size={16} color="white" />
              </Link>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}