import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SiteContainerProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

/** 1320px content column with fluid gutters (16px → 40px). */
export function SiteContainer({ as: Tag = 'div', className, children }: SiteContainerProps) {
  return <Tag className={cn('hb-container', className)}>{children}</Tag>
}

interface SiteGridProps {
  as?: ElementType
  className?: string
  children: ReactNode
}

/**
 * 4 / 8 / 12-column grid (mobile / ≥768px / ≥1024px). Children place
 * themselves with Tailwind spans, e.g. `col-span-4 md:col-span-4 lg:col-span-7`.
 */
export function SiteGrid({ as: Tag = 'div', className, children }: SiteGridProps) {
  return <Tag className={cn('hb-grid', className)}>{children}</Tag>
}
