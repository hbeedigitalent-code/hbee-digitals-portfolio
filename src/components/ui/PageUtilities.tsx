'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export default function PageUtilities() {
  const reducedMotion = useReducedMotion()
  const [showTop, setShowTop] = useState(false)
  const { scrollYProgress } = useScroll()

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  })

  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 650)
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.div
        className="fixed left-0 top-0 z-[9999] h-[3px] origin-left bg-[#39D97A] shadow-[0_0_20px_rgba(57,217,122,0.55)]"
        style={{ scaleX }}
      />

      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 18, scale: 0.92 }}
            whileHover={reducedMotion ? undefined : { y: -5, scale: 1.04 }}
            whileTap={reducedMotion ? undefined : { scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="group fixed bottom-24 right-4 z-[9998] flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#39D97A]/25 bg-[#071427]/92 shadow-[0_20px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl transition-all duration-300 hover:border-[#39D97A]/45 hover:bg-[#0B1E38] hover:shadow-[0_22px_80px_rgba(57,217,122,0.16)] sm:bottom-8 sm:right-6"
            aria-label="Scroll back to top"
          >
            <span className="absolute inset-0 scale-0 rounded-full bg-[#39D97A]/12 transition-transform duration-300 group-hover:scale-100" />

            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[#39D97A]/10 transition duration-300 group-hover:bg-[#39D97A]/16">
              <SvgIcon
                name="chevron-down"
                size={17}
                color="#39D97A"
                className="rotate-180 transition duration-300 group-hover:-translate-y-0.5"
              />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}