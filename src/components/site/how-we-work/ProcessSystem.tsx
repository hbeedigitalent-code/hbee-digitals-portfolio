import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { HbeeModule, type ModuleSweep } from '../module/HbeeModule'
import moduleStyles from '../module/hbee-module.module.css'
import { roundedPath, waypointShares, type Pt } from '../module/route-geometry'
import { PROCESS_STAGES } from './how-we-work-content'
import styles from './how-we-work.module.css'

/**
 * PROCESS SYSTEM — the How We Work hero visual (S3.1).
 *
 * One operating process moving through five connected stages, built from the
 * established dimensional Hbee module (HbeeModule: shell, depth planes, sweep,
 * channel, edge energy, glass plane, Signal Insert) in the group's 3D stage.
 * The stages are a different object from the six capability renders, so they
 * stay CSS-built; only their material and composition are brought into the
 * canonical language (gloss, glass, deeper contact shadow, one Signal Insert).
 *
 * Hierarchy is spatial, not strategic: Build is the nearest and largest block
 * (it is where the work is made), Assess and Optimize recede slightly, and
 * the route runs Assess → Prioritize → Build → Activate → Optimize on rounded
 * orthogonal channels with connection nodes. A restrained return channel from
 * Optimize back to Assess says "learning feeds the next assessment" without
 * closing the shape into a literal circle.
 *
 * Motion (CSS only, gated on data-motion-ready, once): ASSEMBLE (stages
 * settle) → CONNECT (route fades in) → SIGNAL (the orange segment travels
 * 01 → 05; each stage lifts a little as it arrives) → RETURN (one faint pulse
 * back toward Assess) → rest. Reduced motion: the final state, signal resting
 * at Optimize, no pulse.
 *
 * Three deliberate compositions (not one scaled): desktop 100 × 92, tablet
 * (viewport 640–1023px) 100 × 70, phones (container ≤ 400px) 100 × 140 with
 * no return loop.
 */

interface Box { x: number; y: number; w: number }
interface Layout {
  viewBox: readonly [number, number]
  boxes: readonly Box[]
  /** Waypoints; the stage-i signal arrival is waypoint `hits[i]`. */
  route: readonly Pt[]
  hits: readonly number[]
  nodes: readonly Pt[]
  ret?: readonly Pt[]
}

const DESKTOP: Layout = {
  viewBox: [100, 92],
  boxes: [{ x: 2, y: 5, w: 22 }, { x: 30, y: 16, w: 25 }, { x: 22, y: 50, w: 42 }, { x: 70, y: 38, w: 26 }, { x: 72, y: 6, w: 22 }],
  route: [[13, 17.5], [42, 17.5], [42, 56], [83, 56], [83, 15.5]],
  hits: [0, 1, 2, 3, 4],
  nodes: [[27, 17.5], [42, 43.75], [67, 56], [83, 31.5]],
  ret: [[83, 6], [83, 2.4], [13, 2.4], [13, 5]],
}
const TABLET: Layout = {
  viewBox: [100, 70],
  boxes: [{ x: 1, y: 8, w: 16 }, { x: 22, y: 16, w: 19 }, { x: 33, y: 36, w: 30 }, { x: 72, y: 27, w: 20 }, { x: 76, y: 4, w: 17 }],
  route: [[9, 19], [36, 19], [36, 42], [82, 42], [82, 11]],
  hits: [0, 1, 2, 3, 4],
  nodes: [[19.5, 19], [36, 34], [67.5, 42], [82, 22.8]],
  ret: [[82, 4], [82, 1.6], [9, 1.6], [9, 8]],
}
const PHONE: Layout = {
  viewBox: [100, 140],
  /* Reads left to right on every row: 01 → 02, then 03, then 04 → 05. The route passes behind Build
     from the right column to the left, so Activate sits left of Optimize and the sequence never reverses. */
  boxes: [{ x: 3, y: 2, w: 34 }, { x: 58, y: 14, w: 36 }, { x: 20, y: 50, w: 60 }, { x: 6, y: 104, w: 34 }, { x: 60, y: 108, w: 32 }],
  route: [[20, 18], [76, 18], [76, 75], [23, 75], [23, 122], [76, 122]],
  hits: [0, 1, 2, 4, 5],
  nodes: [[47.5, 18], [76, 47.5], [23, 102.8], [49.5, 122]],
}

/* Depth: Build nearest, Assess/Optimize set back. Placement only, never a change of colour. */
const DEPTH = [0, 2, 8, 4, 0]
const SWEEP: ModuleSweep[] = ['tr', 'br', 'br', 'tr', 'bl']
const GLASS = [true, false, true, false, true]
/* The one Signal Insert: Build, where the work is made. */
const SIGNAL_INSERT = [false, false, true, false, false]

/* Signal timing: the segment leaves 01 at SIGNAL_START and reaches 05 SIGNAL_MS later. */
const SIGNAL_START = 900
const SIGNAL_MS = 2600

/** When (ms) the signal reaches each stage in a layout. */
function hitTimes(layout: Layout): number[] {
  const shares = waypointShares(layout.route)
  return layout.hits.map((h) => Math.round(SIGNAL_START + shares[h] * SIGNAL_MS))
}
const HITS = { d: hitTimes(DESKTOP), t: hitTimes(TABLET), m: hitTimes(PHONE) }

function slotStyle(i: number): CSSProperties {
  const d = DESKTOP.boxes[i]
  const t = TABLET.boxes[i]
  const m = PHONE.boxes[i]
  return {
    '--dx': d.x,
    '--dy': (d.y / DESKTOP.viewBox[1]) * 100,
    '--dw': d.w,
    '--tx': t.x,
    '--ty': (t.y / TABLET.viewBox[1]) * 100,
    '--tw': t.w,
    '--mx': m.x,
    '--my': (m.y / PHONE.viewBox[1]) * 100,
    '--mw': m.w,
    '--z': DEPTH[i],
    '--hit-d': `${HITS.d[i]}ms`,
    '--hit-t': `${HITS.t[i]}ms`,
    '--hit-m': `${HITS.m[i]}ms`,
    '--hb-motion-index': i,
  } as CSSProperties
}

function Route({ layout, className }: { layout: Layout; className: string }) {
  const d = roundedPath(layout.route)
  const ret = layout.ret ? roundedPath(layout.ret, 1.8) : null
  const [vw, vh] = layout.viewBox
  const last = layout.ret ? layout.ret[layout.ret.length - 1] : null
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} aria-hidden="true" focusable="false" className={cn(moduleStyles.connectors, styles.route, className)}>
      <path className={styles.routeBase} d={d} pathLength={1} fill="none" />
      {ret && <path className={styles.routeReturn} d={ret} pathLength={1} fill="none" />}
      <path className={styles.routeSignal} d={d} pathLength={1} fill="none" />
      {ret && <path className={styles.returnPulse} d={ret} pathLength={1} fill="none" />}
      {layout.nodes.map(([x, y]) => (
        <circle key={`${x}-${y}`} className={styles.routeNode} cx={x} cy={y} r={0.95} />
      ))}
      {last && <circle className={styles.returnNode} cx={last[0]} cy={last[1]} r={0.9} />}
    </svg>
  )
}

export function ProcessSystem({ className }: { className?: string }) {
  return (
    <figure
      className={cn(moduleStyles.figure, styles.systemMotion, className)}
      style={{ '--signal-start': `${SIGNAL_START}ms`, '--signal-ms': `${SIGNAL_MS}ms`, '--return-start': `${SIGNAL_START + SIGNAL_MS + 250}ms` } as CSSProperties}
    >
      <figcaption className="sr-only">
        The Hbee Growth System: five connected stages — Assess, Prioritize, Build, Activate and Optimize — with what is learned at Optimize feeding the next
        assessment.
      </figcaption>
      <div className={cn(moduleStyles.viewport, styles.systemViewport)}>
        <span aria-hidden="true" className={moduleStyles.floor} />
        <div className={cn(moduleStyles.stage, styles.processStage)}>
          <Route layout={DESKTOP} className={styles.routeDesktop} />
          <Route layout={TABLET} className={styles.routeTablet} />
          <Route layout={PHONE} className={styles.routePhone} />

          <ol className={moduleStyles.stageList}>
            {PROCESS_STAGES.map((stage, i) => (
              <li key={stage.name} className={cn(moduleStyles.slot, styles.stageSlot)} style={slotStyle(i)}>
                <HbeeModule
                  label={stage.name}
                  icon={<span className={styles.stageNumber}>{String(i + 1).padStart(2, '0')}</span>}
                  sweep={SWEEP[i]}
                  glass={GLASS[i]}
                  signal={SIGNAL_INSERT[i]}
                  gloss
                  className={styles.stageModule}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </figure>
  )
}
