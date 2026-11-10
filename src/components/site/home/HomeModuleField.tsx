import Image from 'next/image'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import styles from './home-modules.module.css'

/**
 * Dark-section visual: the same six business modules as the Hero, in a second
 * narrative state. Where the Hero presents one compact, centred system, this
 * is the system seen across space: modules separated, at different scales and
 * depths, linked by fine connectors, with only a quiet flat glyph at the centre.
 *
 * Uses the six individual canonical module images (alpha preserved, never
 * filtered or stretched). Stage is 100 × 92 units; x / y / w are in those units.
 * Reduced motion: static. Mobile: a staggered two-column grid (see the CSS).
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
}

const MODULES: FieldModule[] = [
  { key: 'brand', label: 'Brand', px: [999, 1014], x: 2, y: 4, w: 30, z: 3, drift: { dur: 12, delay: 0, amp: -6 } },
  { key: 'experience', label: 'Experience', px: [917, 915], x: 37, y: 0, w: 26, z: 1, drift: { dur: 14, delay: -4, amp: -4 } },
  { key: 'technology', label: 'Technology', px: [1035, 1020], x: 66, y: 9, w: 33, z: 4, drift: { dur: 11, delay: -2, amp: 7 } },
  { key: 'creative', label: 'Creative', px: [958, 951], x: 5, y: 50, w: 27, z: 2, drift: { dur: 13, delay: -6, amp: 5 } },
  { key: 'discovery', label: 'Discovery', px: [919, 909], x: 36, y: 48, w: 29, z: 2, drift: { dur: 15, delay: -1, amp: -5 } },
  { key: 'growth', label: 'Growth', px: [1015, 992], x: 68, y: 54, w: 31, z: 4, drift: { dur: 12.5, delay: -7, amp: 6 } },
]

const STAGE_H = 92
const centre = (m: FieldModule): [number, number] => [m.x + m.w / 2, m.y + (m.w * m.px[1]) / m.px[0] / 2]
const byKey = Object.fromEntries(MODULES.map((m) => [m.key, m]))

/** Fine connectors between neighbouring modules (centre to centre; the modules sit above, so only the gaps show). */
const LINKS: ReadonlyArray<readonly [string, string]> = [
  ['brand', 'experience'],
  ['experience', 'technology'],
  ['brand', 'creative'],
  ['technology', 'growth'],
  ['creative', 'discovery'],
  ['discovery', 'growth'],
]

export function HomeModuleField({ className }: { className?: string }) {
  return (
    <figure className={cn(styles.field, className)}>
      <figcaption className="sr-only">The six parts of a business, Brand, Experience, Technology, Creative, Discovery and Growth, each depending on the others.</figcaption>

      <HbeeModuleGlyph signal="quiet" className={styles.fieldGlyph} />

      <svg className={styles.lines} viewBox={`0 0 100 ${STAGE_H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        {LINKS.map(([a, b], i) => {
          const [x1, y1] = centre(byKey[a])
          const [x2, y2] = centre(byKey[b])
          return (
            <g key={`${a}-${b}`}>
              <path className={styles.line} d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`} />
              <circle className={styles.lineNode} cx={((x1 + x2) / 2).toFixed(2)} cy={((y1 + y2) / 2).toFixed(2)} r="0.8" />
              <circle className={styles.lineNodeRing} cx={((x1 + x2) / 2).toFixed(2)} cy={((y1 + y2) / 2).toFixed(2)} r="0.8" style={{ '--i': i } as CSSProperties} />
            </g>
          )
        })}
      </svg>

      <ul className={styles.fieldList}>
        {MODULES.map((m, i) => (
          <SiteReveal
            as="li"
            key={m.key}
            motion="shift"
            index={i}
            className={styles.item}
            style={{ '--x': m.x, '--y': m.y, '--w': m.w, '--z': m.z } as CSSProperties}
          >
            <span className={styles.itemDrift} style={{ '--dur': `${m.drift.dur}s`, '--delay': `${m.drift.delay}s`, '--amp': `${m.drift.amp}px` } as CSSProperties}>
              <Image
                src={`/brand/modules/${m.key}.webp`}
                alt={m.label}
                width={m.px[0]}
                height={m.px[1]}
                sizes="(min-width: 1024px) 24vw, (min-width: 768px) 30vw, 46vw"
                className={styles.itemImage}
              />
            </span>
          </SiteReveal>
        ))}
      </ul>
    </figure>
  )
}
