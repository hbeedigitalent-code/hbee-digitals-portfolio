'use client'

import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

export default function FloatingWhatsApp() {
  const pathname = usePathname()
  
  // Don't show on admin pages
  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <motion.a
      href="https://wa.me/2348153153827"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="fixed bottom-24 left-4 z-[9998] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] shadow-[0_20px_70px_rgba(57,217,122,0.28)] transition hover:bg-[var(--accent-lime)] sm:bottom-8 sm:left-6"
      aria-label="Chat with Hbee Digitals on WhatsApp"
    >
      <img 
        src="/svgs/whatsapp.svg" 
        alt="WhatsApp" 
        className="h-6 w-6 object-contain"
      />
    </motion.a>
  )
}