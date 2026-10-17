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
  /**
   * Mobile (container ≤ 400px, i.e. phones): the DESKTOP cluster, compacted.
   * Every module keeps its desktop position relative to the others (Brand
   * top-centre, Experience top-right, Technology mid-left, Creative
   * mid-right, Discovery bottom-centre, Growth bottom-right) around the
   * spine, whose orange capsule shows through the centre exactly as on
   * desktop. Modules are enlarged (~36% wide vs 27–32%) so labels hold 14px.
   * Stage aspect 100 / 112; y is % of stage height.
   */
  m: { x: number; y: number; w: number }
  z: number // cqw
  ax: number // assemble start offset, cqw
  ay: number
  /** Hero assemble only: tiny start rotation, degrees (≤ 1.5). */
  ar: number
  sweep: ModuleSweep
  glass?: boolean
  signal?: boolean
}

/* Index-aligned with DEFAULT_MODULE_ITEMS. */
const SLOTS: Slot[] = [
  { x: 16, y: 3, w: 30, m: { x: 17.5, y: 1, w: 36 }, z: 7, ax: -3, ay: -3, ar: -1.5, sweep: 'tr', glass: true },  // Brand
  { x: 55, y: 10, w: 28, m: { x: 57.5, y: 9, w: 36 }, z: 5, ax: 3, ay: -3, ar: 1.2, sweep: 'br' },              // Experience
  { x: 3, y: 36, w: 31, m: { x: 3.5, y: 34, w: 37 }, z: 2, ax: -4, ay: 0, ar: -1, sweep: 'br' },                // Technology
  { x: 65, y: 39, w: 27, m: { x: 65, y: 38, w: 34 }, z: 0, ax: 4, ay: 0, ar: 1.5, sweep: 'tr', glass: true }, // Creative
  { x: 19, y: 68, w: 28, m: { x: 17.5, y: 68, w: 36 }, z: -1, ax: -3, ay: 3, ar: 1, sweep: 'bl' },               // Discovery
  { x: 54, y: 64, w: 32, m: { x: 57, y: 64, w: 38 }, z: 4, ax: 3, ay: 3, ar: -1.2, sweep: 'br', signal: true }, // Growth
]

/* On mobile the spine stays the centre of the cluster, as on desktop; its capsule shows through the middle. */
const SPINE = { x: 28, y: 22, w: 44, m: { x: 28.5, y: 22, w: 50 }, z: -5 }

/**
 * Mobile connectors (viewBox 0 0 100 112): the desktop connector set mapped
 * onto the compact cluster — left loop Brand → Technology, right loop
 * Experience → Creative, a short Technology → Discovery link, and the orange
 * Discovery → Growth link. Static, lower prominence, no drawing on phones.
 */
const MOBILE_CONNECTORS: { d: string; signal?: boolean }[] = [
  { d: 'M17.5 14H13Q9.5 14 9.5 17.5V38' },       // Brand → Technology
  { d: 'M93.5 22H95Q98.5 22 98.5 25.5V42.6' },   // Experience → Creative
  { d: 'M25.5 69.9V76.2' },                       // Technology → Discovery
  { d: 'M53.5 92H57', signal: true },             // Discovery → Growth
]
const MOBILE_NODES: { x: number; y: number; tone: 'light' | 'energy' }[] = [
  { x: 17.5, y: 14, tone: 'light' },
  { x: 9.5, y: 26, tone: 'energy' },
  { x: 98.5, y: 32, tone: 'energy' },
  { x: 55.25, y: 92, tone: 'light' },
]

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

/**
 * Hero SIGNAL: the path the orange signal travels, in stage units — from the
 * spine's activation capsule, down the clear central channel (between
 * Technology/Discovery and Creative/Growth — it crosses no other module's
 * label), then turns into Growth and docks on its Signal Insert. Drawn at
 * Growth's depth so the endpoint lands on the insert.
 */
const SIGNAL_PATH = 'M50.2 43.1V67.7Q50.2 71.7 54.2 71.7H79.2'
const SIGNAL_TIMING = { begin: '0.78s', dur: '0.52s' }

const NODES: { x: number; y: number; tone: 'light' | 'energy' }[] = [
  { x: 16, y: 11, tone: 'light' },
  { x: 6, y: 25, tone: 'energy' },
  { x: 93, y: 39, tone: 'energy' },
  { x: 47, y: 84, tone: 'light' },
]

function slotStyle(
  s: { x: number; y: number; w: number; m: { x: number; y: number; w: number }; z: number; ax?: number; ay?: number; ar?: number },
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
    '--ar': `${s.ar ?? 0}deg`,
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
  /**
   * `reveal` (default): fades in and assembles when scrolled into view.
   * `hero`: visible from first paint; plays ASSEMBLE → CONNECT → SIGNAL →
   * SETTLE once, CSS/SMIL only (no JS, no rAF). Gated on the pre-paint
   * data-motion-ready flag, so reduced motion renders the final state.
   * `settle`: visible from first paint; the quieter variant for secondary
   * pages — modules settle from a small offset and the connectors fade in.
   * No drawing, no travelling signal. Same gate as `hero`.
   */
  motion?: 'reveal' | 'hero' | 'settle'
  /**
   * Print the module names on the faces (default). The word labels are sized for a figure of
   * roughly 300px or more; a small figure (the Client Portal's compact uses) sets this to
   * false and shows icon-only modules, with the names carried by real text elsewhere.
   */
  showLabels?: boolean
  /** Homepage can use the existing full brand asset; other surfaces keep their spine. */
  spine?: 'module' | 'brand'
  /** Desktop-only homepage spacing; shared/tablet/phone geometry stays unchanged. */
  composition?: 'default' | 'homeHero'
  className?: string
}

export function HbeeModuleGroup({
  items = DEFAULT_MODULE_ITEMS,
  label = 'Connected capabilities',
  idPrefix = 'system',
  state = 'connected',
  motion = 'reveal',
  showLabels = true,
  spine = 'module',
  composition = 'default',
  className,
}: HbeeModuleGroupProps) {
  const connected = state === 'connected'
  const hero = motion === 'hero'
  const six = items.slice(0, SLOTS.length)

  const content = (
    <>
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
            {NODES.map((n, i) => (
              <circle
                key={`${n.x}-${n.y}`}
                className={styles.node}
                style={{ '--hb-motion-index': i } as CSSProperties}
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

          <svg viewBox="0 0 100 112" aria-hidden="true" focusable="false" className={styles.connectorsMobile}>
            {MOBILE_CONNECTORS.map((c) => (
              <path
                key={c.d}
                d={c.d}
                fill="none"
                stroke={c.signal && connected ? 'var(--hb-signal)' : 'var(--hb-electric)'}
                strokeOpacity={c.signal && connected ? 0.9 : 0.45}
                strokeWidth={0.55}
                strokeLinecap="round"
              />
            ))}
            {MOBILE_NODES.map((n) => (
              <circle
                key={`${n.x}-${n.y}`}
                cx={n.x}
                cy={n.y}
                r={1.3}
                fill={n.tone === 'energy' ? 'var(--hb-electric)' : '#ffffff'}
                stroke="var(--hb-electric)"
                strokeOpacity={0.6}
                strokeWidth={0.4}
              />
            ))}
          </svg>

          <div className={styles.slot} style={slotStyle(SPINE, 0)} aria-hidden="true">
            <HbeeSpine idPrefix={idPrefix} signal={connected} appearance={spine} />
          </div>

          <ul className={styles.stageList}>
            {six.map((item, i) => {
              const s = SLOTS[i]
              return (
                <li key={item.label} className={styles.slot} style={slotStyle(s, i + 1)}>
                  <HbeeModule label={showLabels ? item.label : undefined} icon={item.icon} sweep={s.sweep} glass={s.glass} signal={connected && s.signal} />
                </li>
              )
            })}
          </ul>

          {hero && connected && (
            <svg viewBox="0 0 100 104" aria-hidden="true" focusable="false" className={styles.travelLayer}>
              {/* One orange signal, visible only while it travels; it hands off to
                  Growth's insert, which glows briefly and returns to rest. */}
              <g opacity={0}>
                <circle r={2.6} fill="#fc5d1c" opacity={0.2} />
                <circle r={1.15} fill="#fc5d1c" />
                <animateMotion
                  path={SIGNAL_PATH}
                  begin={SIGNAL_TIMING.begin}
                  dur={SIGNAL_TIMING.dur}
                  fill="freeze"
                  calcMode="spline"
                  keyPoints="0;1"
                  keyTimes="0;1"
                  keySplines="0.65 0 0.35 1"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.12;0.84;1"
                  begin={SIGNAL_TIMING.begin}
                  dur={SIGNAL_TIMING.dur}
                  fill="freeze"
                />
              </g>
            </svg>
          )}
        </div>
      </div>
    </>
  )

  if (hero) {
    return <figure className={cn(styles.figure, styles.heroMotion, composition === 'homeHero' && styles.homeComposition, className)}>{content}</figure>
  }

  if (motion === 'settle') {
    return <figure className={cn(styles.figure, styles.settleMotion, className)}>{content}</figure>
  }

  return (
    <SiteReveal motion="reveal" as="figure" className={cn(styles.figure, className)}>
      {content}
    </SiteReveal>
  )
}
