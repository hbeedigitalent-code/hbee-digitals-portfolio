'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('hbee_cookie_consent')
    if (!accepted) setVisible(true)
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('hbee_cookie_consent', 'accepted')
    setVisible(false)
  }

  const declineCookies = () => {
    localStorage.setItem('hbee_cookie_consent', 'declined')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 left-1/2 z-[999] w-[calc(100%-24px)] max-w-4xl -translate-x-1/2 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#071427]/90 p-4 text-white shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-5"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.16),transparent_42%)]" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#39D97A] sm:flex">
                <SvgIcon name="security" size={22} color="#06101F" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white">We use cookies</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-white/60">
                  We use cookies to improve your browsing experience, analyze site traffic, and make
                  our website better. Read our{' '}
                  <Link href="/privacy" className="font-bold text-[#39D97A] hover:text-[#C6F135]">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={declineCookies}
                className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65 transition hover:border-white/20 hover:text-white"
              >
                Decline
              </button>

              <button
                type="button"
                onClick={acceptCookies}
                className="rounded-full bg-[#39D97A] px-5 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}