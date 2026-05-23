'use client'

import Image from 'next/image'

interface PremiumImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  aspect?: string
}

export default function PremiumImage({
  src,
  alt,
  className = '',
  priority = false,
  aspect = 'aspect-[4/3]',
}: PremiumImageProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-[1.7rem] border border-[#1E314A] bg-[#07111F] ${aspect}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 50vw"
        className={`object-cover object-center transition duration-700 group-hover:scale-[1.04] ${className}`}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/30 via-transparent to-transparent" />
    </div>
  )
}