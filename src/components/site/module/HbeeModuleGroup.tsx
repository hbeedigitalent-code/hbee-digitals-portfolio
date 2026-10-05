import type { CSSProperties, ReactNode } from 'react'
import { BarChart3, Lightbulb, Search, Settings, Tag, UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SiteReveal } from '../motion/SiteReveal'
import { HbeeModule, HbeeSpine, type ModuleSweep } from './HbeeModule'
import styles from './hbee-module.module.css'

/**
 * HBEE MODULE GROUP — the connected system, static 2.5D (CSS 3D, no WebGL).
 *
 * Composition (stage = 100 × 104 units, viewed at a shallow 3/4 angle):
 *   upper plane   Brand · Experience
 *   middle plane  Technology · Creative
 *   lower plane   Discovery · Growth
 *   behind        the structural spine (module geometry extruded at scale),
 *                 two rear glass panels, translucent connectors and nodes
 *
 * Orange appears exactly twice: the spine's activation capsule and the
 * Signal Insert on Growth, the destination.
 *
 * Phase 3 can replace the renderer (Spline/WebGL) while keeping this
 * content contract: six labelled modules, one spine, Growth as the signal.
 *
 * Motion: the figure REVEALs (opacity on a flat ancestor), and each module
 * ASSEMBLEs into its slot by transform only. Reduced motion: static.
 */

export interface ModuleGroupItem {
  label: string
  icon?: ReactNode
}

const ICON_PROPS = { strokeWidth: 1.75, width: '100%', height: '100%' } as const

export const DEFAULT_MODULE_ITEMS: ModuleGroupItem[] = [
  { label: 'Brand', icon: <Tag {...ICON_PROPS} /> },
  { label: 'Experience', icon: <UserRound {...ICON_PROPS} /> },
  { label: 'Technology', icon: <Settings {...ICON_PROPS} /> },
  { label: 'Creative', icon: <Lightbulb {...ICON_PROPS} /> },
  { label: 'Discovery', icon: <Search {...ICON_PROPS} /> },
  { label: 'Growth', icon: <BarChart3 {...ICON_PROPS} /> },
]

interface Slot {
  x: number
  y: number
  w: number
  /** Mobile (container ≤ 400px, i.e. phones): larger modules in a taller 2 × 3 stagger. */
  m: { x: number; y: number; w: number }
  z: number // cqw
  ax: number // assemble start offset, cqw
  ay: number
  sweep: ModuleSweep
  glass?: boolean
  signal?: boolean
}

/* Index-aligned with DEFAULT_MODULE_ITEMS. */
const SLOTS: Slot[] = [
  { x: 16, y: 3, w: 30, m: { x: 4, y: 1, w: 42 }, z: 7, ax: -3, ay: -3, sweep: 'tr', glass: true },  // Brand
  { x: 55, y: 10, w: 28, m: { x: 54, y: 7, w: 42 }, z: 5, ax: 3, ay: -3, sweep: 'br' },              // Experience
  { x: 3, y: 36, w: 31, m: { x: 4, y: 35, w: 42 }, z: 2, ax: -4, ay: 0, sweep: 'br' },               // Technology
  { x: 65, y: 39, w: 27, m: { x: 54, y: 41, w: 42 }, z: 0, ax: 4, ay: 0, sweep: 'tr', glass: true }, // Creative
  { x: 19, y: 68, w: 28, m: { x: 4, y: 69, w: 42 }, z: -1, ax: -3, ay: 3, sweep: 'bl' },             // Discovery
  { x: 54, y: 64, w: 32, m: { x: 54, y: 75, w: 42 }, z: 4, ax: 3, ay: 3, sweep: 'br', signal: true }, // Growth
]

/* On mobile the spine narrows into the column gap so its signal stays visible. */
const SPINE = { x: 28, y: 22, w: 44, m: { x: 35, y: 38, w: 30 }, z: -5 }

const GLASS_PANELS = [
  { x: 10, y: 0, w: 78, h: 34, z: -8 },
  { x: 50, y: 35, w: 48, h: 62, z: -9 },
]

const CONNECTORS = [
  'M16 11H9.5Q6 11 6 14.5V36',     // Brand → Technology
  'M83 19H89.5Q93 19 93 22.5V39',  // Experience → Creative
  'M24 61V68',                     // Technology → Discovery
  'M78 61V64',                     // Creative → Growth
  'M47 84H54',                     // Discovery → Growth
]

const NODES: { x: number; y: number; tone: 'light' | 'energy' }[] = [
  { x: 16, y: 11, tone: 'light' },
  { x: 6, y: 25, tone: 'energy' },
  { x: 93, y: 39, tone: 'energy' },
  { x: 47, y: 84, tone: 'light' },
]

function slotStyle(
  s: { x: number; y: number; w: number; m: { x: number; y: number; w: number }; z: number; ax?: number; ay?: number },
  index: number,
) {
  return {
    '--dx': s.x,
    '--dy': s.y,
    '--dw': s.w,
    '--mx': s.m.x,
    '--my': s.m.y,
    '--mw': s.m.w,
    '--z': s.z,
    '--ax': s.ax ?? 0,
    '--ay': s.ay ?? 0,
    '--hb-motion-index': index,
  } as CSSProperties
}

interface HbeeModuleGroupProps {
  items?: ModuleGroupItem[]
  /** Accessible description of the whole composition. */
  label?: string
  /** Unique per page when the group is rendered more than once. */
  idPrefix?: string
  /**
   * `connected` (default): the resting system.
   * `fragmented`: modules drift apart, connectors fade and no orange
   * appears — used where the story is about disconnection.
   */
  state?: 'connected' | 'fragmented'
  className?: string
}

export function HbeeModuleGroup({
  items = DEFAULT_MODULE_ITEMS,
  label = 'Connected capabilities',
  idPrefix = 'system',
  state = 'connected',
  className,
}: HbeeModuleGroupProps) {
  const connected = state === 'connected'
  const six = items.slice(0, SLOTS.length)

  return (
    <SiteReveal motion="reveal" as="figure" className={cn(styles.figure, className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <div className={styles.viewport} data-system={state}>
        <span aria-hidden="true" className={styles.floor} />
        <div className={styles.stage}>
          {GLASS_PANELS.map((g, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={styles.glassPanel}
              style={{ '--x': g.x, '--y': g.y, '--gw': g.w, '--gh': g.h, '--z': g.z } as CSSProperties}
            />
          ))}

          <svg viewBox="0 0 100 104" aria-hidden="true" focusable="false" className={styles.connectors}>
            {CONNECTORS.map((d, i) => (
              <path
                key={d}
                d={d}
                pathLength={1}
                data-connect=""
                fill="none"
                stroke="var(--hb-electric)"
                strokeOpacity={0.4}
                strokeWidth={0.35}
                strokeLinecap="round"
                style={{ '--hb-motion-index': i } as CSSProperties}
              />
            ))}
            {NODES.map((n) => (
              <circle
                key={`${n.x}-${n.y}`}
                cx={n.x}
                cy={n.y}
                r={n.tone === 'energy' ? 1 : 1.25}
                fill={n.tone === 'energy' ? 'var(--hb-electric)' : '#ffffff'}
                stroke="var(--hb-electric)"
                strokeOpacity={0.55}
                strokeWidth={0.3}
              />
            ))}
          </svg>

          <div className={styles.slot} style={slotStyle(SPINE, 0)} aria-hidden="true">
            <HbeeSpine idPrefix={idPrefix} signal={connected} />
          </div>

          <ul className={styles.stageList}>
            {six.map((item, i) => {
              const s = SLOTS[i]
              return (
                <li key={item.label} className={styles.slot} style={slotStyle(s, i + 1)}>
                  <HbeeModule label={item.label} icon={item.icon} sweep={s.sweep} glass={s.glass} signal={connected && s.signal} />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </SiteReveal>
  )
}
