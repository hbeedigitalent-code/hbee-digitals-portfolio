'use client'

import Image from 'next/image'

interface SvgIconProps {
  name: string
  size?: number
  color?: string
  className?: string
  alt?: string
}

const aliasMap: Record<string, string> = {
  web: 'web-development',
  design: 'ui-ux',
  marketing: 'digital-marketing',
  'brand-strategy': 'branding',
  conversion: 'analytics',
  verified: 'security',
  message: 'messages',
  star: 'testimonials',
  quote: 'testimonials',
  cart: 'ecommerce',
  ecommerce: 'ecommerce',
}

function cleanSvgName(value?: string) {
  if (!value) return 'services'

  const cleaned = value
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  return aliasMap[cleaned] || cleaned || 'services'
}

export default function SvgIcon({
  name,
  size = 20,
  color = '#39D97A',
  className = '',
  alt = '',
}: SvgIconProps) {
  const iconName = cleanSvgName(name)

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMask: `url(/svgs/${iconName}.svg) center / contain no-repeat`,
        mask: `url(/svgs/${iconName}.svg) center / contain no-repeat`,
        flexShrink: 0,
      }}
      role={alt ? 'img' : 'presentation'}
      aria-label={alt || undefined}
    />
  )
}