'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export default function CookieBanner() {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('hbee_cookie_consent')
    if (!consent) {
      const timer = window.setTimeout(() => setVisible(true), 900)
      return () => window.clearTimeout(timer)
    }
  }, [])

  const saveConsent = (value: 'accepted' | 'declined') => {
    localStorage.setItem('hbee_cookie_consent', value)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          className="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-3 sm:px-5 sm:pb-5"
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-4 text-[var(--text-primary)] shadow-[var(--shadow-lg)] backdrop-blur-2xl sm:rounded-2xl sm:p-5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--accent)/0.16,transparent_40%)]" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex flex-1 gap-4">
                <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 shadow-[0_0_35px_rgba(57,217,122,0.25)] sm:flex">
                  <SvgIcon name="security" size={22} color="var(--accent)" />
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-black text-[var(--text-primary)] sm:text-base">
                    We use cookies to improve your experience
                  </h3>

                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)] sm:text-sm sm:leading-6">
                    We use cookies to understand site performance, improve browsing, and personalize
                    your experience. Read our{' '}
                    <Link
                      href="/privacy"
                      className="font-bold text-[var(--accent)] underline-offset-4 transition hover:text-[var(--accent-lime)] hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:flex-shrink-0">
                <button
                  type="button"
                  onClick={() => saveConsent('declined')}
                  className="min-h-[44px] rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                >
                  Decline
                </button>

                <button
                  type="button"
                  onClick={() => saveConsent('accepted')}
                  className="min-h-[44px] rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-[var(--btn-primary-text)] shadow-[0_0_30px_rgba(57,217,122,0.2)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
                >
                  Accept All
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}