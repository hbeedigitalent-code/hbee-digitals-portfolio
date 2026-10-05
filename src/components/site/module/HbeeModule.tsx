import { cn } from '@/lib/cn'

/**
 * HBEE MODULE — the static vector unit of the public visual system.
 *
 * Derived from the existing mark, not a copy of it. What carries over:
 *   Structural Shell  the D's straight top edge running into a controlled
 *                     Sweep Radius and back along the base
 *   Connection Gap    the break between the stem and the base (from the
 *                     separated strokes in the mark)
 *   Open Channel      the open top-left corner between stem and shell
 *   Signal Insert     ONE capsule — near-square left edge, full round right
 *                     edge — instead of the mark's stacked pair
 *   Node              optional small square with one swept corner
 *
 * The H top nub and the double capsule are deliberately left out so the
 * module reads as related to the logo rather than as the logo.
 *
 * STRUCTURE IS BLUE (--hb-structure), ACTION IS ORANGE (--hb-signal).
 * Colours come from the surrounding tone, so the same module works on Cloud
 * and Night.
 *
 * Geometry is on a 48-unit grid; stroke 5 ≈ the mark's stroke-to-size ratio.
 */

export const MODULE_GEOMETRY = {
  viewBox: '0 0 48 48',
  shell: 'M18 7.5H28A12.5 12.5 0 0 1 40.5 20V28A12.5 12.5 0 0 1 28 40.5H13',
  stem: 'M9.5 18V33',
  signal: 'M18 18H25.5A5 5 0 0 1 25.5 28H18Z',
  node: { x: 7, y: 7, size: 5 },
  stroke: 5,
} as const

export type ModuleSignal = 'signal' | 'quiet' | 'none'

interface HbeeModuleProps {
  /** `signal` = orange insert (action); `quiet` = ice insert; `none` = shell only. */
  signal?: ModuleSignal
  /** Show the node in the open channel. */
  node?: boolean
  /** Quarter-turn variation so groups don't repeat one orientation. */
  rotate?: 0 | 90 | 180 | 270
  /** Rendered edge length in px (defaults to filling the parent via CSS). */
  size?: number
  /** Accessible name. Omit for decorative use (default). */
  title?: string
  className?: string
}

export function HbeeModule({ signal = 'signal', node = false, rotate = 0, size, title, className }: HbeeModuleProps) {
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
        <path d={g.shell} fill="none" stroke="var(--hb-structure)" strokeWidth={g.stroke} strokeLinecap="butt" />
        <path d={g.stem} fill="none" stroke="var(--hb-structure)" strokeWidth={g.stroke} strokeLinecap="butt" />
        {node && (
          <rect
            x={g.node.x}
            y={g.node.y}
            width={g.node.size}
            height={g.node.size}
            rx={0.6}
            fill="var(--hb-structure)"
          />
        )}
        {signal !== 'none' && (
          <path d={g.signal} fill={signal === 'signal' ? 'var(--hb-signal)' : 'var(--hb-structure-soft)'} />
        )}
      </g>
    </svg>
  )
}
