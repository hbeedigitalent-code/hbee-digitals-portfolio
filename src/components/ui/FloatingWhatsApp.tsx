'use client'

import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export default function FloatingWhatsApp() {
  return (
    <motion.a
      href="https://wa.me/2348153153827"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 18, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className="fixed bottom-24 left-4 z-[9998] flex h-12 w-12 items-center justify-center rounded-full bg-[#39D97A] shadow-[0_20px_70px_rgba(57,217,122,0.28)] transition hover:bg-[#C6F135] sm:bottom-8 sm:left-6"
      aria-label="Chat with Hbee Digitals on WhatsApp"
    >
      <SvgIcon name="whatsapp" size={22} color="#06101F" />
    </motion.a>
  )
}