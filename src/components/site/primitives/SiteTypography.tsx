import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ── Eyebrow ───────────────────────────────────────────────── */

interface SiteEyebrowProps {
  /** Prefix with a compact orange Signal Capsule. */
  signal?: boolean
  as?: 'p' | 'span' | 'div'
  className?: string
  children: ReactNode
}

/** Uppercase small label. The only uppercase text in the system. */
export function SiteEyebrow({ signal = false, as: Tag = 'p', className, children }: SiteEyebrowProps) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center gap-2.5 font-hb-body text-[length:var(--hb-text-eyebrow)] font-semibold uppercase leading-none tracking-[0.14em] text-hb-fg-body',
        className,
      )}
    >
      {signal && (
        <span
          aria-hidden="true"
          className="block h-2 w-3.5 rounded-l-[2px] rounded-r-full bg-hb-signal"
        />
      )}
      {children}
    </Tag>
  )
}

/* ── Headings ──────────────────────────────────────────────── */

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4'
type HeadingSize = 'display' | 'h1' | 'h2' | 'h3' | 'h4'

const HEADING_SIZE: Record<HeadingSize, string> = {
  display: 'text-[length:var(--hb-text-display)] leading-[0.98] tracking-[-0.04em] font-bold',
  h1: 'text-[length:var(--hb-text-h1)] leading-[1.03] tracking-[-0.035em] font-bold',
  h2: 'text-[length:var(--hb-text-h2)] leading-[1.07] tracking-[-0.03em] font-bold',
  h3: 'text-[length:var(--hb-text-h3)] leading-[1.2] tracking-[-0.02em] font-semibold',
  h4: 'text-[length:var(--hb-text-h4)] leading-[1.35] tracking-[-0.01em] font-semibold',
}

interface SiteDisplayHeadingProps {
  /** Semantic level — independent of visual size. `p`/`span` for display text that is not a heading. */
  as?: HeadingLevel | 'p' | 'span'
  size?: HeadingSize
  id?: string
  className?: string
  children: ReactNode
}

/** Manrope editorial heading. Sentence case is a content rule, not a transform. */
export function SiteDisplayHeading({ as: Tag = 'h2', size = 'h2', id, className, children }: SiteDisplayHeadingProps) {
  return (
    <Tag id={id} className={cn('font-hb-display text-hb-fg', HEADING_SIZE[size], className)}>
      {children}
    </Tag>
  )
}

/* ── Lede ──────────────────────────────────────────────────── */

interface SiteLedeProps {
  className?: string
  children: ReactNode
}

export function SiteLede({ className, children }: SiteLedeProps) {
  return (
    <p className={cn('max-w-[38rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body', className)}>
      {children}
    </p>
  )
}
