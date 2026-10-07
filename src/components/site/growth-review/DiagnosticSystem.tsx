import type { CSSProperties, ReactNode } from 'react'
import { BarChart3, Repeat2, Search, ShieldCheck, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/cn'
import { HbeeModule, HbeeSpine, type ModuleSweep } from '../module/HbeeModule'
import moduleStyles from '../module/hbee-module.module.css'
import { GR_AREAS, type AreaKey } from './growth-review-content'
import styles from './growth-review.module.css'

/**
 * DIAGNOSTIC SYSTEM — the Growth Review hero visual. The five Growth
 * Readiness areas as Hbee modules around the Hbee spine (the same dimensional
 * language and 3D stage as the other heroes: HbeeModule, HbeeSpine and the
 * module group's stage classes). Each area's route runs into a quiet hub ring
 * around the spine, so the five read as one system with one centre.
 *
 * Story: scattered business signals → connected into one system.
 * Motion (CSS, gated on data-motion-ready, once): ASSEMBLE (areas settle in)
 * → CONNECT (routes draw to the hub) → one orange SIGNAL enters the system
 * from Visibility → SETTLE. Reduced motion: the final, connected state.
 *
 * Variants:
 * - `hero` — the introduction, with the one-time motion above.
 * - `received` — the confirmation: settled, routes complete, hub nodes filled,
 *   the spine's signal lit. The answers have entered the review system.
 * - `idle` — the direct-visit recovery state: the same system at rest, with
 *   NO signal anywhere and hollow hub nodes. It must never read as a success.
 *
 * Stage 100 × 96 on desktop; 100 × 112 on phones (container ≤ 400px).
 */

export type DiagnosticVariant = 'hero' | 'received' | 'idle'

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%' } as const
const ICONS: Record<AreaKey, ReactNode> = {
  visibility: <Search {...ICON} />,
  conversion: <ShoppingCart {...ICON} />,
  retention: <Repeat2 {...ICON} />,
  authority: <ShieldCheck {...ICON} />,
  scalability: <BarChart3 {...ICON} />,
}

interface Box { x: number; y: number; w: number }
interface Slot { d: Box; m: Box; z: number; sweep: ModuleSweep }
type Point = readonly [number, number]

/* x / w in % of stage width; y in stage units (desktop 0–96, phones 0–112). Module height = 0.86 × width. */
const SLOTS: Record<AreaKey, Slot> = {
  visibility: { d: { x: 7, y: 7, w: 26 }, m: { x: 2, y: 4, w: 32 }, z: 6, sweep: 'tr' },
  conversion: { d: { x: 67, y: 10, w: 26 }, m: { x: 66, y: 9, w: 32 }, z: 4, sweep: 'br' },
  retention: { d: { x: 4, y: 51, w: 26 }, m: { x: 2, y: 60, w: 32 }, z: 2, sweep: 'bl' },
  scalability: { d: { x: 70, y: 53, w: 26 }, m: { x: 66, y: 63, w: 32 }, z: 3, sweep: 'tr' },
  authority: { d: { x: 37, y: 70, w: 26 }, m: { x: 34, y: 79, w: 32 }, z: 5, sweep: 'br' },
}
/* The spine is square; the hub is its centre. */
const SPINE = { d: { x: 35, y: 31, w: 30 }, m: { x: 34, y: 38, w: 32 }, z: -4 }
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

const CAPTIONS: Record<DiagnosticVariant, string> = {
  hero: 'The five areas the Growth Review looks at — Visibility, Conversion, Retention, Authority and Scalability — connected to one centre.',
  received: 'Your answers, received into the Hbee review system.',
  idle: 'The five areas the Growth Review looks at, connected to one centre.',
}

function Routes({ keys, box, hub, ring, viewBox, className }: { keys: AreaKey[]; box: 'd' | 'm'; hub: Point; ring: number; viewBox: string; className: string }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false" className={cn(className, styles.spokes)}>
      <circle className={styles.hubRing} cx={hub[0]} cy={hub[1]} r={ring} pathLength={1} fill="none" />
      {keys.map((k, i) => (
        <path
          key={k}
          className={styles.spoke}
          d={route(centre(SLOTS[k][box]), onRing(centre(SLOTS[k][box]), hub, ring))}
          pathLength={1}
          fill="none"
          style={{ '--hb-motion-index': i } as CSSProperties}
        />
      ))}
      <path
        className={styles.spokeSignal}
        d={route(centre(SLOTS.visibility[box]), onRing(centre(SLOTS.visibility[box]), hub, ring))}
        pathLength={1}
        fill="none"
      />
      {keys.map((k, i) => {
        const [cx, cy] = onRing(centre(SLOTS[k][box]), hub, ring)
        return <circle key={k} className={styles.hubNode} cx={cx} cy={cy} r={1.1} style={{ '--hb-motion-index': i } as CSSProperties} />
      })}
    </svg>
  )
}

export function DiagnosticSystem({ variant = 'hero', className, idPrefix = 'diagnostic' }: { variant?: DiagnosticVariant; className?: string; idPrefix?: string }) {
  const keys = GR_AREAS.map((a) => a.key)
  const vh = { d: 96, m: 112 }
  return (
    <figure className={cn(moduleStyles.figure, styles.diagnostic, className)} data-variant={variant}>
      <figcaption className="sr-only">{CAPTIONS[variant]}</figcaption>
      <div className={cn(moduleStyles.viewport, styles.diagnosticViewport)}>
        <span aria-hidden="true" className={moduleStyles.floor} />
        <div className={cn(moduleStyles.stage, styles.diagnosticStage)}>
          <Routes keys={keys} box="d" hub={HUB_D} ring={RING_D} viewBox="0 0 100 96" className={moduleStyles.connectors} />
          <Routes keys={keys} box="m" hub={HUB_M} ring={RING_M} viewBox="0 0 100 112" className={moduleStyles.connectorsMobile} />

          <div className={cn(moduleStyles.slot, styles.diagnosticSpine)} style={slotStyle(SPINE.d, SPINE.m, SPINE.z, 0, vh)} aria-hidden="true">
            <HbeeSpine idPrefix={idPrefix} signal={variant !== 'idle'} />
          </div>

          <ul className={moduleStyles.stageList}>
            {GR_AREAS.map((area, i) => {
              const s = SLOTS[area.key]
              return (
                <li key={area.key} className={cn(moduleStyles.slot, styles.diagnosticSlot)} style={slotStyle(s.d, s.m, s.z, i + 1, vh)}>
                  <HbeeModule label={area.name} icon={ICONS[area.key]} sweep={s.sweep} className={styles.diagnosticModule} />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </figure>
  )
}
