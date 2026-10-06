import type { CSSProperties } from 'react'
import { BarChart3, Lightbulb, Settings, Target, UserRound } from 'lucide-react'
import { cn } from '@/lib/cn'
import { HbeeModule, HbeeSpine, type ModuleSweep } from '../module/HbeeModule'
import moduleStyles from '../module/hbee-module.module.css'
import styles from './work.module.css'

/**
 * WORK SYSTEM — the Work hero visual. Same dimensional language as the
 * homepage and capability systems (HbeeModule, HbeeSpine, the group's 3D
 * stage classes), different composition: one central work module, four
 * conceptual disciplines around it, the spine behind with its single orange
 * signal at the central module's edge.
 *
 * The labels are CONCEPTUAL visual language (how Hbee work is connected),
 * not project evidence — no client names, results or metrics appear here.
 *
 * Motion (CSS only, gated on data-motion-ready): ASSEMBLE — the central
 * module establishes, the disciplines settle in; CONNECT — links fade in and
 * the orange link draws; SETTLE. Once. Reduced motion: final state.
 *
 * Stage 100 / 92 desktop, 100 / 112 phones (container ≤ 400px).
 */

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%' } as const

interface Slot {
  x: number
  y: number
  w: number
  m: { x: number; y: number; w: number }
  z: number
  ax: number
  ay: number
  sweep: ModuleSweep
}

const CENTRAL: Slot = { x: 3, y: 14, w: 46, m: { x: 1, y: 8, w: 54 }, z: 8, ax: 0, ay: 0, sweep: 'tr' }

const DISCIPLINES: { label: string; icon: JSX.Element; slot: Slot }[] = [
  { label: 'Strategy', icon: <Target {...ICON} />, slot: { x: 63, y: 1, w: 29, m: { x: 60, y: 1, w: 38 }, z: -2, ax: 2.5, ay: -2, sweep: 'br' } },
  { label: 'Experience', icon: <UserRound {...ICON} />, slot: { x: 70, y: 35, w: 28, m: { x: 61, y: 34, w: 38 }, z: -4, ax: 3, ay: 0, sweep: 'tr' } },
  { label: 'Technology', icon: <Settings {...ICON} />, slot: { x: 14, y: 69, w: 27, m: { x: 4, y: 62, w: 38 }, z: -5, ax: -2.5, ay: 3, sweep: 'bl' } },
  { label: 'Creative', icon: <Lightbulb {...ICON} />, slot: { x: 52, y: 68, w: 28, m: { x: 48, y: 66, w: 38 }, z: -3, ax: 2.5, ay: 2.5, sweep: 'br' } },
]

const SPINE = { x: 37, y: 9, w: 42, m: { x: 37, y: 5, w: 44 }, z: -6 }

/* Links (viewBox 0 0 100 92). */
const LINKS = ['M3 32H1.5Q0 32 0 33.5V79H14', 'M63 12H52Q50.5 12 50.5 13.5V18', 'M84 61V74H80', 'M41 82H52']
const SIGNAL_LINK = 'M49.5 33H55'
const LINKS_MOBILE = ['M1 24V75H4', 'M80 26V34', 'M42 80H48']

function slotStyle(s: { x: number; y: number; w: number; m: { x: number; y: number; w: number }; z: number }, index: number, ax = 0, ay = 0) {
  return {
    '--dx': s.x,
    '--dy': s.y,
    '--dw': s.w,
    '--mx': s.m.x,
    '--my': s.m.y,
    '--mw': s.m.w,
    '--z': s.z,
    '--ax': ax,
    '--ay': ay,
    '--hb-motion-index': index,
  } as CSSProperties
}

export function WorkSystem({ className }: { className?: string }) {
  return (
    <figure className={cn(moduleStyles.figure, styles.systemMotion, className)}>
      <figcaption className="sr-only">
        Hbee work, connected: strategy, experience, technology and creative brought together around one piece of work.
      </figcaption>
      <div className={cn(moduleStyles.viewport, styles.systemViewport)}>
        <span aria-hidden="true" className={moduleStyles.floor} />
        <div className={moduleStyles.stage}>
          <svg viewBox="0 0 100 92" aria-hidden="true" focusable="false" className={cn(moduleStyles.connectors, styles.systemLinks)}>
            {LINKS.map((d) => (
              <path key={d} d={d} fill="none" stroke="var(--hb-electric)" strokeOpacity={0.4} strokeWidth={0.35} strokeLinecap="round" />
            ))}
            <path className={styles.systemSignal} d={SIGNAL_LINK} pathLength={1} fill="none" stroke="var(--hb-signal)" strokeWidth={0.6} strokeLinecap="round" />
            <circle cx={0} cy={56} r={1} fill="var(--hb-electric)" stroke="var(--hb-electric)" strokeOpacity={0.55} strokeWidth={0.3} />
          </svg>
          <svg viewBox="0 0 100 112" aria-hidden="true" focusable="false" className={cn(moduleStyles.connectorsMobile, styles.systemLinks)}>
            {LINKS_MOBILE.map((d) => (
              <path key={d} d={d} fill="none" stroke="var(--hb-electric)" strokeOpacity={0.45} strokeWidth={0.55} strokeLinecap="round" />
            ))}
          </svg>

          <div className={cn(moduleStyles.slot, styles.systemSpine)} style={slotStyle(SPINE, 1)} aria-hidden="true">
            <HbeeSpine idPrefix="work-hero" signal />
          </div>

          <ul className={moduleStyles.stageList}>
            <li className={cn(moduleStyles.slot, styles.systemCentral)} style={slotStyle(CENTRAL, 0)}>
              <HbeeModule label="Connected Work" icon={<BarChart3 {...ICON} />} sweep={CENTRAL.sweep} glass />
            </li>
            {DISCIPLINES.map((d, i) => (
              <li key={d.label} className={cn(moduleStyles.slot, styles.systemDiscipline)} style={slotStyle(d.slot, i + 2, d.slot.ax, d.slot.ay)}>
                <HbeeModule label={d.label} icon={d.icon} sweep={d.slot.sweep} className={styles.disciplineModule} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  )
}
