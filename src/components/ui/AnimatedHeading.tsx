'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedHeadingProps {
  children: ReactNode
  badge?: string
  description?: string
  className?: string
}

export default function AnimatedHeading({ children, badge, description, className = '' }: AnimatedHeadingProps) {
  return (
    <div className={className}>
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4"
        >
          <span className="text-xs font-semibold text-[var(--accent)]">{badge}</span>
        </motion.div>
      )}
      
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]"
      >
        {children}
      </motion.h2>
      
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 text-[var(--text-secondary)] max-w-2xl mx-auto"
        >
          {description}
        </motion.p>
      )}
    </div>
  )
}