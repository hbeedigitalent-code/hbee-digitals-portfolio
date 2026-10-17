import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import styles from './hbee-module.module.css'

/**
 * HBEE MODULE — the signature unit of the public visual system.
 *
 * Two forms:
 *   HbeeModule       dimensional (2.5D) block, the branded default. Must sit in
 *                    a 3D context: HbeeModuleGroup or HbeeModuleStandalone.
 *   HbeeModuleGlyph  flat SVG drawing of the same geometry, for small or
 *                    decorative uses (footer accent, icons).
 *
 * Anatomy of the dimensional block:
 *   1 Structural Shell  Royal Blue face
 *   2 Depth Plane       stacked Deep Blue → Navy layers along Z
 *   3 Sweep             one large-radius corner, from the mark's D
 *   4 Open Channel      recessed slot with a Connection Gap (the mark's
 *                       separated stem)
 *   5 Edge Energy       restrained Electric Blue rim, strongest top-left
 *   6 Glass Plane       optional translucent support behind the block
 *   7 Signal Insert     optional raised orange capsule — activation, used on
 *                       very few modules
 */

/* ── Shared geometry (48-unit grid) ─────────────────────────── */

export const MODULE_GEOMETRY = {
  viewBox: '0 0 48 48',
  shell: 'M18 7.5H28A12.5 12.5 0 0 1 40.5 20V28A12.5 12.5 0 0 1 28 40.5H13',
  stem: 'M9.5 18V33',
  signal: 'M18 18H25.5A5 5 0 0 1 25.5 28H18Z',
  node: { x: 7, y: 7, size: 5 },
  stroke: 5,
} as const

const DEPTH_LAYERS = 9

/**
 * Plain-hex fallback for one depth layer, for browsers without color-mix().
 * Mirrors the CSS mix: Deep Blue (#07338F) toward Navy (#04122E) by `pct`.
 */
function depthFallback(pct: number) {
  const a = [0x07, 0x33, 0x8f]
  const b = [0x04, 0x12, 0x2e]
  const t = Math.min(Math.max(pct, 0), 100) / 100
  return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * t).toString(16).padStart(2, '0')).join('')
}

export type ModuleSweep = 'br' | 'tr' | 'bl' | 'tl'

const SWEEP_CLASS: Record<ModuleSweep, string> = {
  br: styles.sweepBR,
  tr: styles.sweepTR,
  bl: styles.sweepBL,
  tl: styles.sweepTL,
}

/* ── Dimensional module ─────────────────────────────────────── */

export interface HbeeModuleProps {
  /** Real HTML text on the face. */
  label?: string
  /** Decorative icon (rendered aria-hidden). */
  icon?: ReactNode
  /** Raised orange Signal Insert. Keep to one or two per composition. */
  signal?: boolean
  /** Translucent glass plane behind the block. Selected modules only. */
  glass?: boolean
  /** Which corner carries the large Sweep Radius. */
  sweep?: ModuleSweep
  className?: string
}

export function HbeeModule({ label, icon, signal = false, glass = false, sweep = 'br', className }: HbeeModuleProps) {
  return (
    <div className={cn(styles.module, SWEEP_CLASS[sweep], className)}>
      {glass && <span aria-hidden="true" className={styles.glass} />}
      {Array.from({ length: DEPTH_LAYERS }, (_, n) => {
        const i = DEPTH_LAYERS - n // back-most first
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn(styles.layer, i === DEPTH_LAYERS && styles.layerLast)}
            style={{ '--i': i, '--hbm-layer-fallback': depthFallback(i * 10) } as CSSProperties}
          />
        )
      })}
      <div className={styles.face}>
        <span aria-hidden="true" className={styles.channel} />
        {signal && <span aria-hidden="true" className={styles.signal} />}
        {icon ? (
          <span aria-hidden="true" className={styles.icon}>
            {icon}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        {label && <span className={styles.label}>{label}</span>}
      </div>
    </div>
  )
}

/** One module in its own perspective — for anatomy and specimens. */
export function HbeeModuleStandalone({
  width = 66,
  className,
  ...module
}: HbeeModuleProps & { /** Module width as % of this element. */ width?: number }) {
  return (
    <div className={cn(styles.single, className)}>
      <div className={styles.singleViewport}>
        <div className={styles.singleStage}>
          <div className={styles.singleSlot} style={{ '--w-num': width } as CSSProperties}>
            <HbeeModule {...module} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Structural spine: the module geometry extruded at large scale ── */

interface HbeeSpineProps {
  /** Orange capsule in the open channel — the system's activation point. */
  signal?: boolean
  /** Unique per page — prefixes the SVG gradient ids. */
  idPrefix: string
  appearance?: 'module' | 'brand'
}

/**
 * A larger, unlabelled structural module that sits behind the labelled ones
 * and ties the system together. It is the module glyph (shell + stem)
 * extruded along Z, so the system's backbone is literally Hbee geometry.
 */
export function HbeeSpine({ signal = true, idPrefix, appearance = 'module' }: HbeeSpineProps) {
  if (appearance === 'brand') {
    return <div className={cn(styles.spine, styles.brandSpine)} aria-hidden="true">
      {Array.from({ length: 8 }, (_, n) => <span key={n} className={styles.brandDepth} style={{ '--i': 8 - n } as CSSProperties} />)}
      <img src="/svgs/logo.png" alt="" width={512} height={512} className={styles.brandFace} decoding="async" />
    </div>
  }
  const g = MODULE_GEOMETRY
  const gradId = `hbspine-${idPrefix}`
  const layers = 10
  return (
    <div className={styles.spine} aria-hidden="true">
      {Array.from({ length: layers }, (_, n) => {
        const i = layers - n
        return (
          <svg
            key={i}
            viewBox={g.viewBox}
            className={styles.spineLayer}
            style={{ '--i': i, '--hbm-layer-fallback': depthFallback(i * 9) } as CSSProperties}
            focusable="false"
          >
            <g fill="none" strokeWidth={8} strokeLinecap="butt">
              <path d={g.shell} className={styles.spineStroke} />
              <path d={g.stem} className={styles.spineStroke} />
            </g>
          </svg>
        )
      })}
      <svg viewBox={g.viewBox} className={styles.spineLayer} style={{ '--i': 0 } as CSSProperties} focusable="false">
        <defs>
          <linearGradient id={`${gradId}-face`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3a7bff" />
            <stop offset="0.35" stopColor="#0d4fd0" />
            <stop offset="0.7" stopColor="#0642b3" />
            <stop offset="1" stopColor="#06379a" />
          </linearGradient>
          <linearGradient id={`${gradId}-signal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff7a45" />
            <stop offset="0.55" stopColor="#fc5d1c" />
            <stop offset="1" stopColor="#e5490f" />
          </linearGradient>
        </defs>
        <g fill="none" strokeWidth={8} strokeLinecap="butt">
          <path d={g.shell} stroke={`url(#${gradId}-face)`} />
          <path d={g.stem} stroke={`url(#${gradId}-face)`} />
        </g>
        {/* Edge energy along the outer sweep */}
        <path
          d="M18 3.5H28A16.5 16.5 0 0 1 44.5 20V28"
          fill="none"
          stroke="rgba(150,190,255,0.85)"
          strokeWidth={0.45}
        />
      </svg>
      {signal && (
        <>
          {[3, 2, 1].map((i) => (
            <svg
              key={`s${i}`}
              viewBox={g.viewBox}
              className={styles.spineLayer}
              style={{ '--i': i - 4 } as CSSProperties}
              focusable="false"
            >
              <path d={g.signal} fill="#b8380a" />
            </svg>
          ))}
          <svg viewBox={g.viewBox} className={styles.spineLayer} style={{ '--i': -4 } as CSSProperties} focusable="false">
            <path d={g.signal} fill={`url(#${gradId}-signal)`} />
          </svg>
        </>
      )}
    </div>
  )
}

/* ── Flat glyph ─────────────────────────────────────────────── */

interface HbeeModuleGlyphProps {
  signal?: 'signal' | 'quiet' | 'none'
  node?: boolean
  rotate?: 0 | 90 | 180 | 270
  size?: number
  title?: string
  className?: string
}

export function HbeeModuleGlyph({ signal = 'signal', node = false, rotate = 0, size, title, className }: HbeeModuleGlyphProps) {
  const g = MODULE_GEOMETRY
  return (
    <svg
      viewBox={g.viewBox}
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn('block shrink-0 overflow-visible', className)}
    >
      <g transform={rotate ? `rotate(${rotate} 24 24)` : undefined}>
        <path d={g.shell} fill="none" stroke="var(--hb-structure)" strokeWidth={g.stroke} />
        <path d={g.stem} fill="none" stroke="var(--hb-structure)" strokeWidth={g.stroke} />
        {node && <rect x={g.node.x} y={g.node.y} width={g.node.size} height={g.node.size} rx={0.6} fill="var(--hb-structure)" />}
        {signal !== 'none' && (
          <path d={g.signal} fill={signal === 'signal' ? 'var(--hb-signal)' : 'var(--hb-structure-soft)'} />
        )}
      </g>
    </svg>
  )
}
