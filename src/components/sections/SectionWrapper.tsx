'use client'

import { ReactNode, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface SectionWrapperProps {
  children: ReactNode
  background?: 'white' | 'gray' | 'dark'
  id?: string
  className?: string
  noPadding?: boolean
}

export default function SectionWrapper({
  children,
  background = 'white',
  id,
  className = '',
  noPadding = false,
}: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  const backgroundClasses = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    dark: 'bg-navy-900',
  }

  const textClasses = {
    white: 'text-navy-900',
    gray: 'text-navy-900',
    dark: 'text-white',
  }

  return (
    <section
      ref={ref}
      id={id}
      className={`${backgroundClasses[background]} ${textClasses[background]} ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`max-w-7xl mx-auto px-5 sm:px-6 md:px-10 ${noPadding ? '' : 'py-12 md:py-16 lg:py-20'}`}
      >
        {children}
      </motion.div>
    </section>
  )
}