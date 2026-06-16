'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface SectionHeadingProps {
  children: ReactNode
  variant?: 'light' | 'dark'
  className?: string
}

export default function SectionHeading({ children, variant = 'light', className = '' }: SectionHeadingProps) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
      className={`section-heading ${variant === 'dark' ? 'section-heading-dark' : ''} ${className}`}
    >
      {children}
    </motion.h2>
  )
}