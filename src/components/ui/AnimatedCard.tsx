'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  onClick?: () => void
  href?: string
}

export default function AnimatedCard({ children, className = '', delay = 0, onClick, href }: AnimatedCardProps) {
  const Component = href ? 'a' : 'div'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}