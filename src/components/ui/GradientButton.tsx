'use client'

import Link from 'next/link'
import { ReactNode } from 'react'

interface GradientButtonProps {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
}

export default function GradientButton({
  href,
  children,
  variant = 'primary',
  className = '',
}: GradientButtonProps) {
  const variants = {
    primary: 'bg-gradient-orange-green text-white shadow-[0_4px_20px_rgba(255,107,53,0.3)] hover:shadow-[0_8px_30px_rgba(255,107,53,0.4)]',
    secondary: 'bg-gradient-dark-blue text-white',
    outline: 'border-2 border-[var(--accent)] bg-transparent text-[var(--accent)] hover:bg-[var(--accent)]/10',
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black transition-all duration-300 hover:scale-[1.02] ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  )
}