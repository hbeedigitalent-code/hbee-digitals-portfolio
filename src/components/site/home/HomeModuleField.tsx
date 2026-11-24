import Image from 'next/image'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteScene } from '../motion/SiteScene'
import styles from './home-modules.module.css'

/**
 * Dark-section visual: the same six business modules as the Hero, shown as a reversible two-state scene.
 *
 *   p = 0  SCATTERED   the system seen across space: modules separated, at different scales and depths,
 *                      the back layers a little smaller, softer and quieter, connection incomplete.
 *   p = 1  CONNECTED   the same six modules converged on a ring around the central glyph, spokes and ring
 *                      links drawn, and one orange Signal lit last.
 *
 * The scene is scroll-linked (see SiteScene / site-tokens.css "Scenes"): it stays scattered while the section's
 * copy is read, then assembles as the section moves toward its exit, and separates again on the way back up.
 * The connected composition is NEW (a ring around the glyph); it deliberately does not imitate the Hero's baked
 * artwork, which has a different camera angle.
 *
 * Uses the six individual canonical module images (alpha preserved, never stretched or recoloured). Stage is
 * 100 × 92 units; x / y / w are in those units. Reduced motion, no JS: the scene renders CONNECTED (p = 1).
 * Mobile: the existing staggered two-column grid; the same story, told with ≤16px of vertical movement.
 */

interface FieldModule {
  key: string
  label: string
  /** Intrinsic size of the trimmed asset. */
  px: readonly [number, number]
  x: number
  y: number
  w: number
  /** Stacking only; larger = nearer. */
  z: number
  drift: { dur: number; delay: number; amp: number }
  /** Connected-state centre on the ring (stage units). */
  ring: readonly [number, number]
  /** Back layer: smaller, quieter and (desktop only, two modules) softer while scattered. */
  back?: boolean
  soft?: boolean
}

/** Connected composition: a hexagonal ring of equal-width modules around the glyph at the stage centre. */
const CENTRE = [50, 46] as const
const RING_W = 24
const RING_R = 28
const ringAt = (deg: number): readonly [number, number] => [
  CENTRE[0] + RING_R * Math.cos((deg * Math.PI) / 180),
  CENTRE[1] + RING_R * Math.sin((deg * Math.PI) / 180),
]

const MODULES: FieldModule[] = [
  { key: 'brand', label: 'Brand', px: [999, 1014], x: 2, y: 4, w: 30, z: 3, drift: { dur: 12, delay: 0, amp: -6 }, ring: ringAt(-120) },
  { key: 'experience', label: 'Experience', px: [917, 915], x: 37, y: 0, w: 26, z: 1, drift: { dur: 14, delay: -4, amp: -4 }, ring: ringAt(-60), back: true, soft: true },
  { key: 'technology', label: 'Technology', px: [1035, 1020], x: 66, y: 9, w: 33, z: 4, drift: { dur: 11, delay: -2, amp: 7 }, ring: ringAt(0) },
  { key: 'creative', label: 'Creative', px: [958, 951], x: 5, y: 50, w: 27, z: 2, drift: { dur: 13, delay: -6, amp: 5 }, ring: ringAt(180), back: true },
  { key: 'discovery', label: 'Discovery', px: [919, 909], x: 36, y: 48, w: 29, z: 2, drift: { dur: 15, delay: -1, amp: -5 }, ring: ringAt(120), back: true, soft: true },
  { key: 'growth', label: 'Growth', px: [1015, 992], x: 68, y: 54, w: 31, z: 4, drift: { dur: 12.5, delay: -7, amp: 6 }, ring: ringAt(60) },
]

const STAGE_H = 92
const aspect = (m: FieldModule) => m.px[1] / m.px[0]
/** Scattered centre. */
const centre = (m: FieldModule): [number, number] => [m.x + m.w / 2, m.y + (m.w * aspect(m)) / 2]
const byKey = Object.fromEntries(MODULES.map((m) => [m.key, m]))
const fixed = (value: number) => value.toFixed(2)

/** Scattered links between neighbouring modules (centre to centre; the modules sit above, so only the gaps show). */
const LINKS: ReadonlyArray<readonly [string, string]> = [
  ['brand', 'experience'],
  ['experience', 'technology'],
  ['brand', 'creative'],
  ['technology', 'growth'],
  ['creative', 'discovery'],
  ['discovery', 'growth'],
]

/** Connected links: the six modules close into one ring (brand → experience → technology → growth → discovery → creative). */
const RING_ORDER = ['brand', 'experience', 'technology', 'growth', 'discovery', 'creative'] as const
const SPOKE_START = 12.5

function spoke(m: FieldModule) {
  const [x, y] = m.ring
  const dx = x - CENTRE[0]
  const dy = y - CENTRE[1]
  const length = Math.hypot(dx, dy)
  return `M${fixed(CENTRE[0] + (dx / length) * SPOKE_START)} ${fixed(CENTRE[1] + (dy / length) * SPOKE_START)}L${fixed(x)} ${fixed(y)}`
}

/** Window inside the scene's 0..1 where a layer moves. */
const win = (s: number, e: number) => ({ '--s': s, '--e': e }) as CSSProperties

export function HomeModuleField({ className }: { className?: string }) {
  return (
    <SiteScene as="figure" anchor="center" from={0.8} to={0.46} compact={{ from: 0.85, to: 0.45 }} className={cn(styles.field, className)}>
      <figcaption className="sr-only">The six parts of a business, Brand, Experience, Technology, Creative, Discovery and Growth, each depending on the others.</figcaption>

      <span aria-hidden="true" data-layer="" style={win(0.4, 0.9)} className={styles.fieldGlyph}>
        <HbeeModuleGlyph signal="quiet" className="h-auto w-full" />
      </span>

      <svg className={styles.lines} viewBox={`0 0 100 ${STAGE_H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {/* Scattered links: present while the system is apart, released as the modules converge. */}
        <g data-layer="" style={win(0.25, 0.55)} className={styles.scatterLinks}>
          {LINKS.map(([a, b], i) => {
            const [x1, y1] = centre(byKey[a])
            const [x2, y2] = centre(byKey[b])
            return (
              <g key={`${a}-${b}`}>
                <path className={styles.line} d={`M${fixed(x1)} ${fixed(y1)}L${fixed(x2)} ${fixed(y2)}`} />
                <circle className={styles.lineNode} cx={fixed((x1 + x2) / 2)} cy={fixed((y1 + y2) / 2)} r="0.8" />
                <circle className={styles.lineNodeRing} cx={fixed((x1 + x2) / 2)} cy={fixed((y1 + y2) / 2)} r="0.8" style={{ '--i': i } as CSSProperties} />
              </g>
            )
          })}
        </g>
        {/* Connected links: spokes to the glyph, then the ring closing. Drawn by progress, so they un-draw on the way back. */}
        <g className={styles.connected}>
          {MODULES.map((m, i) => (
            <path key={`spoke-${m.key}`} data-layer="" style={win(0.5 + i * 0.03, 0.78 + i * 0.03)} className={styles.draw} pathLength={1} d={spoke(m)} />
          ))}
          {RING_ORDER.map((key, i) => {
            const a = byKey[key].ring
            const b = byKey[RING_ORDER[(i + 1) % RING_ORDER.length]].ring
            return <path key={`ring-${key}`} data-layer="" style={win(0.58 + i * 0.04, 0.84 + i * 0.04)} className={styles.draw} pathLength={1} d={`M${fixed(a[0])} ${fixed(a[1])}L${fixed(b[0])} ${fixed(b[1])}`} />
          })}
          {/* The one orange Signal: lit last, on the ring between Growth and Discovery. */}
          <circle data-layer="" style={win(0.88, 1)} className={styles.signal} cx={fixed(CENTRE[0])} cy={fixed(CENTRE[1] + RING_R * Math.sin((60 * Math.PI) / 180))} r="1.15" />
        </g>
      </svg>

      {/* Mobile only: the connected state is a simple drawn rail between the two columns, with the Signal at its end. */}
      <span aria-hidden="true" data-layer="" style={win(0.45, 0.9)} className={styles.fieldRail} />
      <span aria-hidden="true" data-layer="" style={win(0.88, 1)} className={styles.fieldRailSignal} />

      <ul className={styles.fieldList}>
        {MODULES.map((m, i) => {
          const [cx, cy] = centre(m)
          const height = m.w * aspect(m)
          return (
            <li
              key={m.key}
              data-layer=""
              className={cn(styles.item, m.back && styles.itemBack, m.soft && styles.itemSoft)}
              style={{
                '--x': m.x,
                '--y': m.y,
                '--w': m.w,
                '--z': m.z,
                // Scattered → ring, as a percentage of the module's own box, and the scale that equalises its width.
                '--tx': ((m.ring[0] - cx) / m.w) * 100,
                '--ty': ((m.ring[1] - cy) / height) * 100,
                '--sf': RING_W / m.w,
                '--s': i * 0.03,
                '--e': 0.72 + i * 0.03,
              } as CSSProperties}
            >
              <span className={styles.itemDrift} style={{ '--dur': `${m.drift.dur}s`, '--delay': `${m.drift.delay}s`, '--amp0': `${m.drift.amp}px` } as CSSProperties}>
                <Image
                  src={`/brand/modules/${m.key}.webp`}
                  alt={m.label}
                  width={m.px[0]}
                  height={m.px[1]}
                  sizes="(min-width: 1024px) 24vw, (min-width: 768px) 30vw, 46vw"
                  className={styles.itemImage}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </SiteScene>
  )
}
