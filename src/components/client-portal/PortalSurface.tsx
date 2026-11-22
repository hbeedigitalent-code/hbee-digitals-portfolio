import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import surface from '@/components/site/module/hbee-surface.module.css'
import styles from './portal-surface.module.css'

/**
 * The portal's surface: the public site's FLAT module anatomy (hbee-surface.module.css), reused, not copied.
 *   sweep corner       one large-radius corner (the D) on an otherwise near-square shell
 *   open channel       a rule along the top edge, deliberately broken by a Connection Gap
 *   signal insert      the orange capsule — at most one per composition (PortalSurface.Signal)
 *   variants           base (outlined) · soft (Mist) · blue (Royal Blue — the one primary moment per screen)
 *
 * Presentation only. It replaces the portal's uniform 14px white box; it carries no data and no behaviour.
 * Clipping: the surface clips its overflow (that is how the sweep is cut), so keep interactive children inside the padding — their focus
 * ring needs room. `portalSurfaceClass` styles a link or button AS a surface (workspace tiles) without wrapping it.
 */

export type PortalSurfaceVariant = 'base' | 'soft' | 'blue'

export interface PortalSurfaceOptions {
  variant?: PortalSurfaceVariant
  /** A smaller sweep, for tiles and rows. */
  compact?: boolean
  /** The channel's solid run lengthens on hover / focus. */
  interactive?: boolean
  /** Standard portal padding (--hb-portal-pad). */
  padded?: boolean
}

export function portalSurfaceClass({ variant = 'base', compact = false, interactive = false, padded = true }: PortalSurfaceOptions = {}): string {
  return cn(surface.surface, surface[variant], compact && surface.compact, interactive && surface.interactive, padded && styles.padded, styles.fill)
}

interface PortalSurfaceProps extends PortalSurfaceOptions, Omit<HTMLAttributes<HTMLElement>, 'className'> {
  as?: ElementType
  className?: string
  children?: ReactNode
}

export function PortalSurface({ as: Tag = 'section', variant, compact, interactive, padded, className, children, ...rest }: PortalSurfaceProps) {
  return (
    <Tag className={cn(portalSurfaceClass({ variant, compact, interactive, padded }), className)} {...rest}>
      {children}
    </Tag>
  )
}

/** The raised orange capsule. Decorative; use on at most one surface per view. */
export function PortalSignal({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn(surface.signal, className)} />
}
