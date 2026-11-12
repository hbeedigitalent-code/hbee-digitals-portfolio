import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { HbeeModule, HbeeSpine, type ModuleSweep } from '../module/HbeeModule'
import moduleStyles from '../module/hbee-module.module.css'
import { CAPABILITY_ICONS } from '../capability/capability-icons'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER, type CapabilitySlug } from '../services/capability-entities'
import styles from './growth-review.module.css'

/**
 * CAPABILITY DIAGNOSTIC SYSTEM — the Growth Review visual (S2.2).
 *
 * The six Hbee capabilities, as modules around the Hbee spine, each routed
 * into one hub. Same dimensional language as the other heroes (HbeeModule,
 * HbeeSpine, the module group's 3D stage). It means one thing: the diagnosis
 * may point into one or more parts of the Hbee system. It is NOT a scoring
 * diagram: the form feeds five internal pillars, and nothing here suggests
 * the six capabilities are individually scored.
 *
 * Motion (CSS, gated on data-motion-ready, once): modules settle in → routes
 * draw to the hub → one orange signal enters → settle. Reduced motion: the
 * final, connected state.
 *
 * Variants: `hero` (introduction, plays once) · `received` (confirmation:
 * routes complete, hub nodes filled, signal lit) · `idle` (direct-visit
 * recovery: system at rest, NO signal, hollow nodes, never reads as success).
 *
 * Stage 100 × 96 on desktop; 100 × 112 on phones (container ≤ 400px).
 * The homepage closing section keeps using the original DiagnosticSystem.
 */

export type DiagnosticVariant = 'hero' | 'received' | 'idle'

const ICON_KEY = {
  'brand-positioning': 'brand',
  'digital-systems': 'systems',
  'creative-ugc': 'creative',
  'discovery-traffic': 'discovery',
  'commerce-experience': 'commerce',
  'retention-growth': 'retention',
} as const

interface Box { x: number; y: number; w: number }
interface Slot { d: Box; m: Box; z: number; sweep: ModuleSweep }
type Point = readonly [number, number]

/* x / w in % of stage width; y in stage units (desktop 0–96, phones 0–112). Module height = 0.86 × width.
   Two columns of three flank the spine; reading order runs down the left, then the right. */
const SLOTS: Record<CapabilitySlug, Slot> = {
  'brand-positioning': { d: { x: 5, y: 5, w: 26 }, m: { x: 2, y: 2, w: 30 }, z: 6, sweep: 'tr' },
  'commerce-experience': { d: { x: 69, y: 5, w: 26 }, m: { x: 68, y: 2, w: 30 }, z: 4, sweep: 'br' },
  'digital-systems': { d: { x: 5, y: 37, w: 26 }, m: { x: 2, y: 43, w: 30 }, z: 3, sweep: 'bl' },
  'creative-ugc': { d: { x: 69, y: 37, w: 26 }, m: { x: 68, y: 43, w: 30 }, z: 5, sweep: 'tr' },
  'discovery-traffic': { d: { x: 5, y: 69, w: 26 }, m: { x: 2, y: 84, w: 30 }, z: 2, sweep: 'bl' },
  'retention-growth': { d: { x: 69, y: 69, w: 26 }, m: { x: 68, y: 84, w: 30 }, z: 4, sweep: 'br' },
}
/* The spine is square; the hub is its centre. */
const SPINE = { d: { x: 35, y: 33, w: 30 }, m: { x: 35, y: 41, w: 30 }, z: -4 }
const HUB_D: Point = [SPINE.d.x + SPINE.d.w / 2, SPINE.d.y + SPINE.d.w / 2]
const HUB_M: Point = [SPINE.m.x + SPINE.m.w / 2, SPINE.m.y + SPINE.m.w / 2]
const RING_D = 18
const RING_M = 17

function centre(b: Box): Point {
  return [b.x + b.w / 2, b.y + (b.w * 0.86) / 2]
}
/** Where the route from `from` crosses the hub ring. */
function onRing(from: Point, hub: Point, r: number): Point {
  const dx = from[0] - hub[0]
  const dy = from[1] - hub[1]
  const len = Math.hypot(dx, dy) || 1
  return [hub[0] + (dx / len) * r, hub[1] + (dy / len) * r]
}
const route = (from: Point, to: Point) => `M${from[0].toFixed(2)} ${from[1].toFixed(2)}L${to[0].toFixed(2)} ${to[1].toFixed(2)}`

function slotStyle(b: Box, m: Box, z: number, index: number, vh: { d: number; m: number }) {
  return {
    '--dx': b.x,
    '--dy': (b.y / vh.d) * 100,
    '--dw': b.w,
    '--mx': m.x,
    '--my': (m.y / vh.m) * 100,
    '--mw': m.w,
    '--z': z,
    '--hb-motion-index': index,
  } as CSSProperties
}

const NAMES = CAPABILITY_ORDER.map((slug) => CAPABILITY_ENTITIES[slug].name).join(', ')
const CAPTIONS: Record<DiagnosticVariant, string> = {
  hero: `The six Hbee capabilities the diagnosis can point into (${NAMES}), connected to one centre.`,
  received: 'Your answers, received into the Hbee review.',
  idle: 'The six Hbee capabilities the diagnosis can point into, connected to one centre.',
}

function Routes({ box, hub, ring, viewBox, className }: { box: 'd' | 'm'; hub: Point; ring: number; viewBox: string; className: string }) {
  const first = CAPABILITY_ORDER[0]
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false" className={cn(className, styles.spokes)}>
      <circle className={styles.hubRing} cx={hub[0]} cy={hub[1]} r={ring} pathLength={1} fill="none" />
      {CAPABILITY_ORDER.map((slug, i) => (
        <path
          key={slug}
          className={styles.spoke}
          d={route(centre(SLOTS[slug][box]), onRing(centre(SLOTS[slug][box]), hub, ring))}
          pathLength={1}
          fill="none"
          style={{ '--hb-motion-index': i } as CSSProperties}
        />
      ))}
      <path className={styles.spokeSignal} d={route(centre(SLOTS[first][box]), onRing(centre(SLOTS[first][box]), hub, ring))} pathLength={1} fill="none" />
      {CAPABILITY_ORDER.map((slug, i) => {
        const [cx, cy] = onRing(centre(SLOTS[slug][box]), hub, ring)
        return <circle key={slug} className={styles.hubNode} cx={cx} cy={cy} r={1.1} style={{ '--hb-motion-index': i } as CSSProperties} />
      })}
    </svg>
  )
}

export function CapabilityDiagnosticSystem({ variant = 'hero', className, idPrefix = 'diagnostic' }: { variant?: DiagnosticVariant; className?: string; idPrefix?: string }) {
  const vh = { d: 96, m: 112 }
  return (
    <figure className={cn(moduleStyles.figure, styles.diagnostic, className)} data-variant={variant}>
      <figcaption className="sr-only">{CAPTIONS[variant]}</figcaption>
      <div className={cn(moduleStyles.viewport, styles.diagnosticViewport)}>
        <span aria-hidden="true" className={moduleStyles.floor} />
        <div className={cn(moduleStyles.stage, styles.diagnosticStage)}>
          <Routes box="d" hub={HUB_D} ring={RING_D} viewBox="0 0 100 96" className={moduleStyles.connectors} />
          <Routes box="m" hub={HUB_M} ring={RING_M} viewBox="0 0 100 112" className={moduleStyles.connectorsMobile} />

          <div className={cn(moduleStyles.slot, styles.diagnosticSpine)} style={slotStyle(SPINE.d, SPINE.m, SPINE.z, 0, vh)} aria-hidden="true">
            <HbeeSpine idPrefix={idPrefix} signal={variant !== 'idle'} />
          </div>

          <ul className={moduleStyles.stageList}>
            {CAPABILITY_ORDER.map((slug, i) => {
              const s = SLOTS[slug]
              const entity = CAPABILITY_ENTITIES[slug]
              return (
                <li key={slug} className={cn(moduleStyles.slot, styles.diagnosticSlot)} style={slotStyle(s.d, s.m, s.z, i + 1, vh)}>
                  <HbeeModule label={entity.module} icon={CAPABILITY_ICONS[ICON_KEY[slug]]} sweep={s.sweep} className={styles.diagnosticModule} />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </figure>
  )
}
