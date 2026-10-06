import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { HbeeModule, HbeeSpine, type ModuleSweep } from '../module/HbeeModule'
import { DEFAULT_MODULE_ITEMS } from '../module/HbeeModuleGroup'
import moduleStyles from '../module/hbee-module.module.css'
import type { SystemModule } from './capability-content'
import styles from './capability.module.css'

/**
 * CAPABILITY FOCUS SYSTEM — the six-module Hbee system with ONE capability
 * featured. Same dimensional language as HbeeModuleGroup (it reuses
 * HbeeModule, HbeeSpine and the group's 3D stage classes); only the
 * composition differs:
 *
 *   featured    the capability's module, largest and in front (left)
 *   spine       behind it; its orange capsule sits at the featured module's
 *               edge — the capability's active link into the system
 *   supporting  the other five modules, smaller, set back, lighter material
 *
 * Motion (CSS only, gated on data-motion-ready like the hero): FOCUS — the
 * featured module establishes; the supporting system settles; CONNECT — the
 * links fade in and the orange link draws; then rest. Reduced motion: final
 * state. Nothing loops.
 *
 * Stage aspect 100 / 92 (desktop), 100 / 120 (phones, container ≤ 400px);
 * y is % of stage height.
 */

interface FocusSlot {
  x: number
  y: number
  w: number
  m: { x: number; y: number; w: number }
  z: number
  /** Settle start offset (cqw). */
  ax: number
  ay: number
  sweep: ModuleSweep
}

const FEATURED: FocusSlot = { x: 3, y: 14, w: 46, m: { x: 1, y: 6, w: 52 }, z: 8, ax: 0, ay: 0, sweep: 'tr' }

/**
 * Supporting positions, filled in a fixed preference order so any featured
 * module yields a coherent arrangement: the five remaining modules, ordered
 * by SUPPORT_ORDER, take top-right, right, bottom-left, bottom-centre,
 * bottom-right. Brand featured → Experience, Creative, Technology,
 * Discovery, Growth. Technology featured → Experience, Creative, Brand,
 * Discovery, Growth.
 */
const SUPPORT_ORDER: SystemModule[] = ['Experience', 'Creative', 'Brand', 'Technology', 'Discovery', 'Growth']
const SUPPORT: FocusSlot[] = [
  { x: 64, y: 2, w: 29, m: { x: 61, y: 1, w: 37 }, z: -2, ax: 2.5, ay: -2, sweep: 'br' },   // top-right
  { x: 70, y: 35, w: 28, m: { x: 61, y: 31, w: 37 }, z: -4, ax: 3, ay: 0, sweep: 'tr' },    // right
  { x: 6, y: 68, w: 25, m: { x: 2, y: 50, w: 37 }, z: -4, ax: -2.5, ay: 2.5, sweep: 'bl' }, // bottom-left
  { x: 35, y: 71, w: 25, m: { x: 22, y: 74, w: 37 }, z: -6, ax: 0, ay: 3, sweep: 'br' },    // bottom-centre
  { x: 66, y: 67, w: 27, m: { x: 61, y: 61, w: 37 }, z: -3, ax: 2.5, ay: 2.5, sweep: 'br' }, // bottom-right
]

/* Capsule lands just right of the featured module's edge (capsule ≈ 48% across the spine box). */
const SPINE = { x: 37, y: 9, w: 42, m: { x: 36, y: 3, w: 44 }, z: -6 }

/* Desktop links (viewBox 0 0 100 92), structural blue; the orange one is the active link. */
const LINKS = [
  'M3 30H1.5Q0 30 0 31.5V74H6',      // featured → bottom-left
  'M64 12H52Q50.5 12 50.5 13.5V18',  // top-right → featured
  'M84 56V67',                       // right → bottom-right
  'M31 80H35',                       // bottom-left → bottom-centre
]
const SIGNAL_LINK = 'M49.5 33H55'
const NODES = [
  { x: 0, y: 52 },
  { x: 84, y: 61 },
]

/* Phone links (viewBox 0 0 100 120). */
const LINKS_MOBILE = ['M2 20H1Q0 20 0 21V50', 'M79.5 26V31', 'M79.5 56.5V61', 'M20.5 76V80H22']

function slotStyle(s: { x: number; y: number; w: number; m: { x: number; y: number; w: number }; z: number }, index: number, extra?: { ax: number; ay: number }) {
  return {
    '--dx': s.x,
    '--dy': s.y,
    '--dw': s.w,
    '--mx': s.m.x,
    '--my': s.m.y,
    '--mw': s.m.w,
    '--z': s.z,
    '--ax': extra?.ax ?? 0,
    '--ay': extra?.ay ?? 0,
    '--hb-motion-index': index,
  } as CSSProperties
}

interface CapabilityFocusSystemProps {
  /** Label on the featured module (the capability name). */
  featuredLabel: string
  /** Which system module the capability is drawn as. */
  module: SystemModule
  /** Accessible description of the composition. */
  label: string
  idPrefix: string
  className?: string
}

export function CapabilityFocusSystem({ featuredLabel, module, label, idPrefix, className }: CapabilityFocusSystemProps) {
  const featuredItem = DEFAULT_MODULE_ITEMS.find((m) => m.label === module) ?? DEFAULT_MODULE_ITEMS[0]
  const supporting = SUPPORT_ORDER.filter((label) => label !== featuredItem.label)
    .map((label) => DEFAULT_MODULE_ITEMS.find((m) => m.label === label))
    .filter((m): m is (typeof DEFAULT_MODULE_ITEMS)[number] => Boolean(m))

  return (
    <figure className={cn(moduleStyles.figure, styles.focusMotion, className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <div className={cn(moduleStyles.viewport, styles.focusViewport)}>
        <span aria-hidden="true" className={moduleStyles.floor} />
        <div className={cn(moduleStyles.stage, styles.focusStage)}>
          <svg viewBox="0 0 100 92" aria-hidden="true" focusable="false" className={cn(moduleStyles.connectors, styles.focusLinks)}>
            {LINKS.map((d) => (
              <path key={d} d={d} fill="none" stroke="var(--hb-electric)" strokeOpacity={0.4} strokeWidth={0.35} strokeLinecap="round" />
            ))}
            <path className={styles.focusSignalLink} d={SIGNAL_LINK} pathLength={1} fill="none" stroke="var(--hb-signal)" strokeWidth={0.6} strokeLinecap="round" />
            {NODES.map((n) => (
              <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r={1} fill="var(--hb-electric)" stroke="var(--hb-electric)" strokeOpacity={0.55} strokeWidth={0.3} />
            ))}
          </svg>

          <svg viewBox="0 0 100 120" aria-hidden="true" focusable="false" className={cn(moduleStyles.connectorsMobile, styles.focusLinks)}>
            {LINKS_MOBILE.map((d) => (
              <path key={d} d={d} fill="none" stroke="var(--hb-electric)" strokeOpacity={0.45} strokeWidth={0.55} strokeLinecap="round" />
            ))}
          </svg>

          <div className={cn(moduleStyles.slot, styles.focusSpine)} style={slotStyle(SPINE, 1)} aria-hidden="true">
            <HbeeSpine idPrefix={idPrefix} signal />
          </div>

          <ul className={moduleStyles.stageList}>
            <li className={cn(moduleStyles.slot, styles.focusFeatured)} style={slotStyle(FEATURED, 0)}>
              <HbeeModule label={featuredLabel} icon={featuredItem.icon} sweep={FEATURED.sweep} glass />
            </li>
            {supporting.map((item, i) => {
              const s = SUPPORT[i]
              return (
                <li key={item.label} className={cn(moduleStyles.slot, styles.focusSupport)} style={slotStyle(s, i + 2, s)}>
                  <HbeeModule label={item.label} icon={item.icon} sweep={s.sweep} className={styles.supportModule} />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </figure>
  )
}
