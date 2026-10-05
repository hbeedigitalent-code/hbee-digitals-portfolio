import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Cards stay quiet unless they have a reason not to.
 *
 *   utility  flat surface, soft border — the default for lists and grids
 *   plane    tinted content plane, no border — grouping without chrome
 *   branded  Level 2: one large Sweep Radius corner (from the mark's D), blue
 *            structural edge, optional orange Signal or Node accent. Use
 *            sparingly — a few per page, not every card.
 */
type SiteCardVariant = 'utility' | 'plane' | 'branded'

interface SiteCardProps {
  variant?: SiteCardVariant
  /** Branded only: compact accent in the open corner. */
  accent?: 'signal' | 'node' | 'none'
  /** Make the whole card respond to hover (pair with an inner stretched link). */
  interactive?: boolean
  as?: ElementType
  className?: string
  children: ReactNode
}

const VARIANT: Record<SiteCardVariant, string> = {
  utility: 'rounded-[var(--hb-radius-md)] border border-hb-border bg-hb-surface',
  plane: 'rounded-[var(--hb-radius-md)] bg-hb-plane',
  branded:
    'rounded-[var(--hb-radius-xs)] rounded-br-[var(--hb-radius-sweep)] border border-hb-border border-l-[3px] border-l-hb-structure bg-hb-surface shadow-[var(--hb-shadow-2)]',
}

export function SiteCard({
  variant = 'utility',
  accent = 'none',
  interactive = false,
  as: Tag = 'div',
  className,
  children,
}: SiteCardProps) {
  return (
    <Tag
      className={cn(
        'relative p-6 md:p-8',
        VARIANT[variant],
        interactive &&
          'transition-[transform,box-shadow,border-color] duration-[var(--hb-dur-base)] ease-[var(--hb-ease)] hover:-translate-y-0.5 hover:border-hb-structure-soft hover:shadow-[var(--hb-shadow-2)] focus-within:border-hb-structure-soft',
        className,
      )}
    >
      {variant === 'branded' && accent === 'signal' && (
        <span
          aria-hidden="true"
          className="absolute right-6 top-6 block h-3 w-6 rounded-l-[2px] rounded-r-full bg-hb-signal md:right-8 md:top-8"
        />
      )}
      {variant === 'branded' && accent === 'node' && (
        <span
          aria-hidden="true"
          className="absolute right-6 top-6 block h-3.5 w-3.5 rounded-[2px] rounded-br-[7px] bg-hb-structure md:right-8 md:top-8"
        />
      )}
      {children}
    </Tag>
  )
}

/* ── Tag ───────────────────────────────────────────────────── */

interface SiteTagProps {
  tone?: 'neutral' | 'structure' | 'signal'
  className?: string
  children: ReactNode
}

const TAG_TONE = {
  neutral: 'border-hb-border text-hb-fg-body',
  structure: 'border-transparent bg-hb-plane text-hb-link',
  signal: 'border-transparent bg-[rgba(252,93,28,0.16)] text-hb-fg',
} as const

/** Small metadata label (capability, industry, project type). Not a button. */
export function SiteTag({ tone = 'neutral', className, children }: SiteTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--hb-radius-xs)] border px-2.5 py-1 text-[0.8125rem] font-medium leading-tight',
        TAG_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
