import { cn } from '@/lib/cn'

/**
 * Site icons — real inline SVG paths, drawn with currentColor.
 *
 * Geometry is taken verbatim from the repository's existing assets so the
 * rebuild reuses the project's own icon language rather than a new set:
 *   SiteArrow    ← public/svgs/arrow-right.svg   (24-unit grid, stroke 2)
 *   SiteChevron  ← public/svgs/chevron-down.svg  (24-unit grid, stroke 2)
 * Inlined (not <img>) so they inherit text colour and can transform on hover.
 *
 * No Unicode arrows, text glyphs or CSS-drawn arrowheads anywhere in the site
 * namespace — use these.
 */

interface IconProps {
  /** Rendered size in px (square). */
  size?: number
  className?: string
}

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

/** Horizontal action arrow. Pair with `group-hover:translate-x-[3px]` for the SHIFT. */
export function SiteArrow({ size = 16, className }: IconProps) {
  return (
    <svg {...BASE} width={size} height={size} className={cn('shrink-0', className)}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

/** Disclosure chevron. Rotate 180° when its menu / accordion is open. */
export function SiteChevron({ size = 14, className }: IconProps) {
  return (
    <svg {...BASE} width={size} height={size} className={cn('shrink-0', className)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
