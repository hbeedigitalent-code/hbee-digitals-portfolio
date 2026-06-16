'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface SectionLabelProps {
  children: ReactNode
  icon?: ReactNode
  className?: string
}

export default function SectionLabel({ children, icon, className = '' }: SectionLabelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`section-label ${className}`}
    >
      {icon && <span className="section-label-icon">{icon}</span>}
      {children}
    </motion.div>
  )
}