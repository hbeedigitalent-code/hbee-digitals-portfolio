import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { SiteReveal } from '../motion/SiteReveal'
import { HbeeModule, type ModuleSignal } from './HbeeModule'

/**
 * HBEE MODULE GROUP — six connected modules, static (Phase 1).
 *
 * SAME SYSTEM, LESS COMPLEXITY: desktop is a staggered 3 × 2 constellation
 * with jogged connectors; mobile is a 2 × 3 column with short straight
 * connectors. Both are fixed-aspect compositions, so tiles (HTML, real text)
 * and connectors (one SVG per layout) share one coordinate space and never
 * drift apart. A later phase can swap this for the dimensional scene; the
 * content contract (items, which one carries the signal) stays the same.
 *
 * Motion: ASSEMBLE (tiles drift in toward their slots) then CONNECT
 * (connectors draw), both CSS-only and skipped under reduced motion.
 */

export interface ModuleGroupItem {
  label: string
  signal?: ModuleSignal
}

export const DEFAULT_MODULE_ITEMS: ModuleGroupItem[] = [
  { label: 'Brand' },
  { label: 'Experience' },
  { label: 'Technology' },
  { label: 'Creative' },
  { label: 'Discovery' },
  { label: 'Growth', signal: 'signal' },
]

interface Layout {
  height: number // viewBox height for a width of 100
  tile: number
  slots: [number, number][] // top-left of each tile, in viewBox units
  connectors: { d: string; signal?: boolean }[]
  nodes: [number, number][]
  stroke: number
}

const DESKTOP: Layout = {
  height: 66,
  tile: 17,
  slots: [
    [6, 8], [41.5, 8], [77, 8],
    [10, 41], [45.5, 41], [81, 41],
  ],
  connectors: [
    { d: 'M23 16.5H41.5' },
    { d: 'M58.5 16.5H77' },
    { d: 'M14.5 25V33H18.5V41' },
    { d: 'M50 25V33H54V41' },
    { d: 'M85.5 25V33H89.5V41' },
    { d: 'M27 49.5H45.5' },
    { d: 'M62.5 49.5H81', signal: true },
  ],
  nodes: [[18.5, 33], [54, 33], [89.5, 33]],
  stroke: 0.35,
}

const MOBILE: Layout = {
  height: 138,
  tile: 36,
  slots: [
    [8, 4], [56, 12],
    [8, 48], [56, 56],
    [8, 92], [56, 100],
  ],
  connectors: [
    { d: 'M44 28H56' },
    { d: 'M26 40V48' },
    { d: 'M74 48V56' },
    { d: 'M44 72H56' },
    { d: 'M26 84V92' },
    { d: 'M74 92V100' },
    { d: 'M44 116H56', signal: true },
  ],
  nodes: [],
  stroke: 0.6,
}

function pct(value: number, of: number) {
  return `${(value / of) * 100}%`
}

function Connectors({ layout, className }: { layout: Layout; className?: string }) {
  return (
    <svg
      viewBox={`0 0 100 ${layout.height}`}
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    >
      {layout.connectors.map((c, i) => (
        <path
          key={c.d}
          d={c.d}
          pathLength={1}
          data-connect=""
          fill="none"
          stroke={c.signal ? 'var(--hb-signal)' : 'var(--hb-structure)'}
          strokeOpacity={c.signal ? 1 : 0.45}
          strokeWidth={layout.stroke}
          strokeLinejoin="round"
          style={{ '--hb-motion-index': i } as CSSProperties}
        />
      ))}
      {layout.nodes.map(([x, y]) => {
        const s = layout.stroke * 4
        return <rect key={`${x}-${y}`} x={x - s / 2} y={y - s / 2} width={s} height={s} fill="var(--hb-structure)" />
      })}
    </svg>
  )
}

interface HbeeModuleGroupProps {
  items?: ModuleGroupItem[]
  /** Accessible description of the whole composition. */
  label?: string
  className?: string
}

export function HbeeModuleGroup({
  items = DEFAULT_MODULE_ITEMS,
  label = 'Connected capabilities',
  className,
}: HbeeModuleGroupProps) {
  const six = items.slice(0, 6)
  const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 0, 270, 0, 0]

  return (
    <SiteReveal motion="none" as="figure" className={cn('relative w-full', className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <div className="relative aspect-[100/138] w-full md:aspect-[100/66]">
        <Connectors layout={MOBILE} className="md:hidden" />
        <Connectors layout={DESKTOP} className="hidden md:block" />

        <ul className="absolute inset-0 m-0 list-none p-0">
          {six.map((item, i) => {
            const [mx, my] = MOBILE.slots[i]
            const [dx, dy] = DESKTOP.slots[i]
            const centreX = dx + DESKTOP.tile / 2
            const style = {
              '--m-x': pct(mx, 100),
              '--m-y': pct(my, MOBILE.height),
              '--d-x': pct(dx, 100),
              '--d-y': pct(dy, DESKTOP.height),
              '--hb-assemble-x': `${centreX < 40 ? -14 : centreX > 60 ? 14 : 0}px`,
              '--hb-assemble-y': `${dy < 30 ? -12 : 12}px`,
              '--hb-motion-index': i,
            } as CSSProperties

            return (
              <li
                key={item.label}
                data-motion="assemble"
                style={style}
                className={cn(
                  'absolute left-[var(--m-x)] top-[var(--m-y)] aspect-square w-[36%] md:left-[var(--d-x)] md:top-[var(--d-y)] md:w-[17%]',
                  'flex flex-col justify-between rounded-[var(--hb-radius-xs)] rounded-br-[30%] border border-hb-border bg-hb-surface p-[9%]',
                  'shadow-[var(--hb-shadow-1)]',
                )}
              >
                <HbeeModule signal={item.signal ?? 'quiet'} rotate={rotations[i]} className="w-[42%]" />
                <span className="font-hb-display text-[clamp(0.75rem,0.68rem+0.3vw,0.9375rem)] font-semibold leading-tight tracking-[-0.01em] text-hb-fg">
                  {item.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </SiteReveal>
  )
}
