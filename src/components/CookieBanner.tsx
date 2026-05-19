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
            className="mx-auto w-full max-w-5xl overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#071427]/95 p-4 text-white shadow-[0_24px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:rounded-[1.6rem] sm:p-5"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.16),transparent_40%)]" />

            <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex gap-4">
                <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#39D97A] shadow-[0_0_35px_rgba(57,217,122,0.25)] sm:flex">
                  <SvgIcon name="security" size={22} color="#06101F" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-white sm:text-base">
                    We use cookies to improve your experience
                  </h3>

                  <p className="mt-1 max-w-3xl text-xs leading-5 text-white/58 sm:text-sm sm:leading-6">
                    We use cookies to understand site performance, improve browsing, and personalize
                    your experience. Read our{' '}
                    <Link
                      href="/privacy"
                      className="font-bold text-[#39D97A] underline-offset-4 transition hover:text-[#C6F135] hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => saveConsent('declined')}
                  className="min-h-[46px] rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                >
                  Decline
                </button>

                <button
                  type="button"
                  onClick={() => saveConsent('accepted')}
                  className="min-h-[46px] rounded-full bg-[#39D97A] px-5 py-3 text-sm font-black text-[#06101F] shadow-[0_0_30px_rgba(57,217,122,0.2)] transition hover:scale-[1.02] hover:bg-[#C6F135]"
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