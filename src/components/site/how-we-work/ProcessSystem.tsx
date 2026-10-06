import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { HbeeModule, type ModuleSweep } from '../module/HbeeModule'
import moduleStyles from '../module/hbee-module.module.css'
import { PROCESS_STAGES } from './how-we-work-content'
import styles from './how-we-work.module.css'

/**
 * PROCESS SYSTEM — the How We Work hero visual. The five stages as one
 * engineered route of Hbee modules (same dimensional language as the other
 * heroes: HbeeModule + the group's 3D stage classes), stepping from Assess
 * to Optimize along one structural connector.
 *
 * One orange signal travels the route once and rests at Optimize. Motion is
 * CSS only, gated on data-motion-ready: ASSEMBLE (stages settle in order) →
 * CONNECT (route fades in) → SIGNAL (travels once) → SETTLE. Reduced
 * motion: final state, signal resting at the end.
 *
 * Stage 100 / 92 desktop; 100 / 118 phones (container ≤ 400px).
 */

interface Slot {
  x: number
  y: number
  w: number
  m: { x: number; y: number; w: number }
  z: number
  sweep: ModuleSweep
}

const SLOTS: Slot[] = [
  { x: 3, y: 2, w: 31, m: { x: 4, y: 2, w: 38 }, z: 6, sweep: 'tr' },
  { x: 40, y: 12, w: 31, m: { x: 54, y: 8, w: 38 }, z: 4, sweep: 'br' },
  { x: 10, y: 39, w: 30, m: { x: 4, y: 34, w: 38 }, z: 2, sweep: 'bl' },
  { x: 36, y: 64, w: 30, m: { x: 54, y: 40, w: 38 }, z: 0, sweep: 'br' },
  { x: 67, y: 52, w: 30, m: { x: 29, y: 71, w: 38 }, z: 3, sweep: 'tr' },
]

/* One route through the stage centres (viewBox 0 0 100 92); hidden behind the modules, visible in the gaps. */
const ROUTE = 'M18.5 16H55.5V52H25V78H82'
/* Phone route (viewBox 0 0 100 118): a two-column zig-zag — 01→02 across,
   down and back to 03, across to 04, down and back to 05. Runs through the
   gaps between modules, so no module hides another stage. */
const ROUTE_MOBILE = 'M23 19H73V44.5H23V60H73V82H48V100'

function slotStyle(s: Slot, i: number) {
  return {
    '--dx': s.x,
    '--dy': s.y,
    '--dw': s.w,
    '--mx': s.m.x,
    '--my': s.m.y,
    '--mw': s.m.w,
    '--z': s.z,
    '--hb-motion-index': i,
  } as CSSProperties
}

export function ProcessSystem({ className }: { className?: string }) {
  return (
    <figure className={cn(moduleStyles.figure, styles.systemMotion, className)}>
      <figcaption className="sr-only">
        The Hbee Growth System: five connected stages — Assess, Prioritize, Build, Activate and Optimize.
      </figcaption>
      <div className={cn(moduleStyles.viewport, styles.systemViewport)}>
        <span aria-hidden="true" className={moduleStyles.floor} />
        <div className={cn(moduleStyles.stage, styles.processStage)}>
          <svg viewBox="0 0 100 92" aria-hidden="true" focusable="false" className={cn(moduleStyles.connectors, styles.route)}>
            <path d={ROUTE} fill="none" stroke="var(--hb-electric)" strokeOpacity={0.45} strokeWidth={0.45} strokeLinejoin="round" strokeLinecap="round" />
            <path className={styles.routeSignal} d={ROUTE} pathLength={1} fill="none" stroke="var(--hb-signal)" strokeWidth={0.9} strokeLinecap="round" />
          </svg>
          <svg viewBox="0 0 100 118" aria-hidden="true" focusable="false" className={cn(moduleStyles.connectorsMobile, styles.route)}>
            <path d={ROUTE_MOBILE} fill="none" stroke="var(--hb-electric)" strokeOpacity={0.5} strokeWidth={0.6} strokeLinejoin="round" strokeLinecap="round" />
            <path className={styles.routeSignal} d={ROUTE_MOBILE} pathLength={1} fill="none" stroke="var(--hb-signal)" strokeWidth={1.1} strokeLinecap="round" />
          </svg>

          <ol className={moduleStyles.stageList}>
            {PROCESS_STAGES.map((stage, i) => (
              <li key={stage.name} className={cn(moduleStyles.slot, styles.stageSlot)} style={slotStyle(SLOTS[i], i)}>
                <HbeeModule
                  label={stage.name}
                  icon={<span className={styles.stageNumber}>{String(i + 1).padStart(2, '0')}</span>}
                  sweep={SLOTS[i].sweep}
                  className={styles.stageModule}
                  glass={i === 0}
                />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </figure>
  )
}
