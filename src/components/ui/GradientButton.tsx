'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface GradientButtonProps {
  href?: string
  onClick?: () => void
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

export default function GradientButton({
  href,
  onClick,
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
}: GradientButtonProps) {
  const baseStyles = `inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 ${className}`

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-outline-dark',
    gradient: 'btn-cta',
  }

  const buttonStyles = `${baseStyles} ${variants[variant]}`

  const content = (
    <>
      {children}
      {(variant === 'primary' || variant === 'gradient') && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={buttonStyles}>
        {content}
      </Link>
    )
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonStyles}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.button>
  )
}