'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div
            className="max-w-3xl mx-auto backdrop-blur-xl rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-center gap-4 border"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
            }}
          >
            <p className="text-sm flex-1" style={{ color: 'var(--text-muted)' }}>
              We use cookies to enhance your browsing experience, analyse site traffic, and personalise content. 
              By clicking “Accept All”, you consent to our use of cookies. 
              <a href="/privacy" className="underline ml-1" style={{ color: 'var(--accent-color)' }}>
                Privacy Policy
              </a>
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={decline}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  borderColor: 'var(--card-border)',
                  borderWidth: '1px',
                  color: 'var(--text-muted)',
                }}
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="px-5 py-2 rounded-full text-sm font-medium text-white transition-all bg-gradient-to-r from-[#007BFF] to-[#00BFFF]"
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