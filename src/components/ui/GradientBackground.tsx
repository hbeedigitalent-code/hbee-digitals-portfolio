'use client'

import { ReactNode } from 'react'

interface GradientBackgroundProps {
  children: ReactNode
  variant?: 'premium' | 'dark-blue' | 'orange-green' | 'warm' | 'light' | 'navy-orange'
  className?: string
  withGlow?: boolean
}

const gradients = {
  premium: 'bg-gradient-premium',
  'dark-blue': 'bg-gradient-dark-blue',
  'orange-green': 'bg-gradient-orange-green',
  warm: 'bg-gradient-warm',
  light: 'bg-gradient-light',
  'navy-orange': 'bg-gradient-navy-orange',
}

export default function GradientBackground({
  children,
  variant = 'premium',
  className = '',
  withGlow = false,
}: GradientBackgroundProps) {
  const glowClass = withGlow ? (variant === 'orange-green' ? 'bg-glow-orange' : 'bg-glow-green') : ''

  return (
    <div className={`relative overflow-hidden ${gradients[variant]} ${className}`}>
      {withGlow && (
        <div className={`absolute inset-0 ${glowClass} pointer-events-none`} />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />
      {children}
    </div>
  )
}