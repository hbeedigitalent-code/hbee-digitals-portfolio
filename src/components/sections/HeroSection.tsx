'use client'

import { HeroData } from '@/types'
import Link from 'next/link'

interface HeroSectionProps {
  data: HeroData
}

export default function HeroSection({ data }: HeroSectionProps) {
  const {
    title,
    subtitle,
    primaryCtaText,
    primaryCtaLink,
    secondaryCtaText,
    secondaryCtaLink,
    backgroundImage
  } = data

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center"
      style={{ 
        backgroundColor: 'var(--primary-color)',
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover'
      }}
    >
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
            style={{ color: 'var(--secondary-color)' }}>
          {title}
        </h1>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90"
           style={{ color: 'var(--secondary-color)' }}>
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={primaryCtaLink}
            className="px-6 py-3 rounded-lg font-semibold transition hover:opacity-90"
            style={{ 
              backgroundColor: 'var(--secondary-color)',
              color: 'var(--primary-color)'
            }}
          >
            {primaryCtaText}
          </Link>
          {secondaryCtaText && secondaryCtaLink && (
            <Link
              href={secondaryCtaLink}
              className="px-6 py-3 border-2 rounded-lg font-semibold transition hover:bg-white/10"
              style={{ 
                borderColor: 'var(--secondary-color)',
                color: 'var(--secondary-color)'
              }}
            >
              {secondaryCtaText}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}