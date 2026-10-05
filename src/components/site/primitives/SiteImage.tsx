import Image from 'next/image'
import { cn } from '@/lib/cn'

/**
 * next/image for CMS media, safe against unknown hosts.
 *
 * next.config.js only allows *.supabase.co and images.unsplash.com for the
 * optimizer; a CMS URL on any other host would throw at render. Those are
 * rendered unoptimized instead of breaking the page.
 */
function isOptimizable(src: string) {
  if (src.startsWith('/')) return true
  try {
    const host = new URL(src).hostname
    return host.endsWith('.supabase.co') || host === 'images.unsplash.com'
  } catch {
    return false
  }
}

interface SiteImageProps {
  src: string
  alt: string
  sizes: string
  className?: string
  priority?: boolean
}

/** Fills its (relatively positioned) parent with object-cover. */
export function SiteImage({ src, alt, sizes, className, priority }: SiteImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizable(src)}
      className={cn('object-cover', className)}
    />
  )
}
