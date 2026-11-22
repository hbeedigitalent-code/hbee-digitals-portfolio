import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { HbeeModuleGlyph } from '@/components/site/module/HbeeModule'
import styles from './portal-primitives.module.css'

/**
 * The portal's empty state: a quiet, on-brand "nothing here yet" with one next step.
 * A flat module glyph (never a 3D render — the Overview's first-run is the one place a 3D module is allowed, passed as `media`),
 * a Manrope title, one line of explanation and at most one action. Unstyled by itself: place it inside a PortalSurface or a ruled section.
 *
 * The earlier version of this file (Tailwind, a 16-unit padded box, an unused SvgIcon dependency) was imported by no page; its props are
 * still accepted so nothing that might use them breaks.
 */
interface EmptyStateProps {
  title: string
  description?: string
  /** A small icon in a Mist disc. Defaults to the flat Hbee module glyph. */
  icon?: ReactNode
  /** Larger decorative media (the first-run module render). Replaces the icon. */
  media?: ReactNode
  /** One action: a link or a button, already styled (portal-primitives .primary / .secondary / .link). */
  action?: ReactNode
  /** Centre everything (for a whole-page empty state). */
  center?: boolean
  /** The element for the title: a paragraph by default, so it never adds an unplanned heading to the outline. */
  titleAs?: ElementType
  className?: string
  /** Legacy props. */
  actionText?: string
  onAction?: () => void
}

export default function EmptyState({ title, description, icon, media, action, center = false, titleAs: Title = 'p', className, actionText, onAction }: EmptyStateProps) {
  const legacy = actionText && onAction ? (
    <button type="button" onClick={onAction} className={styles.primary}>
      {actionText}
    </button>
  ) : null
  return (
    <div className={cn(styles.empty, center && styles.emptyCenter, className)} data-empty-state="">
      {media ? (
        <div className={styles.emptyMedia} aria-hidden="true">
          {media}
        </div>
      ) : (
        <span className={styles.emptyIcon} aria-hidden="true">
          {icon ?? <HbeeModuleGlyph size={20} signal="signal" />}
        </span>
      )}
      <Title className={styles.emptyTitle}>{title}</Title>
      {description && <p className={styles.emptyText}>{description}</p>}
      {(action || legacy) && <div className={styles.emptyAction}>{action ?? legacy}</div>}
    </div>
  )
}

export { EmptyState }
