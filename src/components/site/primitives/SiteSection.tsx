import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { SiteContainer } from './SiteContainer'

export type SiteTone = 'cloud' | 'white' | 'mist' | 'night' | 'deep'

interface SiteSectionProps {
  /** Background environment. `night` / `deep` are the deliberate dark sections. */
  tone?: SiteTone
  spacing?: 'default' | 'compact' | 'none'
  /** Wrap children in SiteContainer (default true). */
  contained?: boolean
  id?: string
  className?: string
  'aria-labelledby'?: string
  children: ReactNode
}

export function SiteSection({
  tone = 'cloud',
  spacing = 'default',
  contained = true,
  id,
  className,
  children,
  ...rest
}: SiteSectionProps) {
  return (
    <section
      id={id}
      data-tone={tone}
      aria-labelledby={rest['aria-labelledby']}
      className={cn(
        'relative isolate',
        spacing === 'default' && 'py-[var(--hb-space-section)]',
        spacing === 'compact' && 'py-[var(--hb-space-section-compact)]',
        className,
      )}
    >
      {contained ? <SiteContainer>{children}</SiteContainer> : children}
    </section>
  )
}
