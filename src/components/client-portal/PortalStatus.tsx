import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { PortalTone } from '@/lib/client-portal/portal-status'
import styles from './portal-status.module.css'

/**
 * The portal's one status component. Five semantic tones; each draws its OWN leading shape and always prints its words, so status never
 * relies on colour alone:
 *   working    filled dot        needs-you  capsule (the logo's signal insert)     done  check
 *   neutral    ring              alert      triangle
 * The shape is decorative (aria-hidden): the words are the accessible name. Presentation only — it decides how an existing status looks.
 */

const TONE_CLASS: Record<PortalTone, string> = {
  working: styles.working,
  'needs-you': styles.needs,
  done: styles.done,
  neutral: styles.neutral,
  alert: styles.alert,
}

function Mark({ tone }: { tone: PortalTone }) {
  const common = { className: styles.mark, viewBox: '0 0 16 16', 'aria-hidden': true, focusable: false } as const
  switch (tone) {
    case 'working':
      return (
        <svg {...common} data-mark="dot">
          <circle cx="8" cy="8" r="4.5" fill="currentColor" />
        </svg>
      )
    case 'needs-you':
      return (
        <svg {...common} data-mark="capsule">
          <rect x="1.5" y="4.75" width="13" height="6.5" rx="3.25" fill="currentColor" />
        </svg>
      )
    case 'done':
      return (
        <svg {...common} data-mark="check">
          <polyline points="3 8.5 6.6 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...common} data-mark="triangle">
          <path d="M8 1.75 15 14H1z" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg {...common} data-mark="ring">
          <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
  }
}

/**
 * The tone's SHAPE alone, for dense rows where the status words are already printed beside it (an attention row's "Overdue · USD 350.00").
 * Decorative (aria-hidden); never use it as the only indication of a status.
 */
export function PortalToneMark({ tone, className }: { tone: PortalTone; className?: string }) {
  return (
    <span className={cn(styles.markOnly, TONE_CLASS[tone], className)} data-tone={tone} aria-hidden="true">
      <Mark tone={tone} />
    </span>
  )
}

export interface PortalStatusProps {
  tone: PortalTone
  children: ReactNode
  /** Smaller pill. */
  size?: 'md' | 'sm'
  /** Draw the mark and words without the pill. */
  plain?: boolean
  /** For use on a Royal Blue surface. */
  onBlue?: boolean
  className?: string
}

export function PortalStatus({ tone, children, size = 'md', plain = false, onBlue = false, className }: PortalStatusProps) {
  return (
    <span className={cn(styles.status, TONE_CLASS[tone], size === 'sm' && styles.sm, plain && styles.plain, onBlue && styles.onBlue, className)} data-tone={tone}>
      <Mark tone={tone} />
      <span className={styles.label}>{children}</span>
    </span>
  )
}
