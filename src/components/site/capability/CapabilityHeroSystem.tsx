import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER, MODULE_IMAGE, type CapabilityEntity } from '../services/capability-entities'
import styles from './capability-hero-system.module.css'

/**
 * CAPABILITY HERO SYSTEM — one capability brought forward inside the connected
 * Hbee system. Reusable: it takes the ACTIVE capability and arranges the other
 * five around it; nothing here is specific to Website & Conversion.
 *
 *   active     the capability's module — largest, nearest, brightest, with the
 *              semantic capability name as real HTML
 *   related    the capability's three adjacent capabilities (semantic model)
 *              — mid scale, full colour, linked
 *   distant    the remaining two — smaller, set back, softer, still linked
 *
 * Artwork is the canonical module renders (/brand/modules/*.webp), used whole
 * and unfiltered except a presentation-only atmosphere on the distant pair.
 * They share one camera, so every module sits in the same scene. Meaning is
 * HTML: the active name, and every other capability as a real, named link.
 *
 * Connection grammar: ONE bus. Distant/related capabilities tie into a single
 * vertical trunk with rounded orthogonal runs (the Hbee mark's grammar); the
 * orange signal link carries that trunk into the active module.
 *
 * Positions are in cqw (percent of the stage width) so the composition scales
 * as one object. Desktop and phone compositions are authored separately.
 */

type Slot = 'r1' | 'r2' | 'r3' | 'd1' | 'd2'
interface Place {
  x: number
  y: number
  w: number
}
interface SlotSpec {
  desktop: Place
  phone: Place
  z: number
}

const ACTIVE: { desktop: Place; phone: Place } = {
  desktop: { x: 0, y: 21, w: 57 },
  phone: { x: 0, y: 7, w: 61 },
}

const SLOTS: Record<Slot, SlotSpec> = {
  r1: { desktop: { x: 66, y: 2, w: 32 }, phone: { x: 63, y: 0, w: 37 }, z: 5 },
  r2: { desktop: { x: 67, y: 38, w: 31 }, phone: { x: 65, y: 31, w: 35 }, z: 5 },
  r3: { desktop: { x: 35, y: 73, w: 26 }, phone: { x: 6, y: 68, w: 33 }, z: 4 },
  d1: { desktop: { x: 3, y: -1, w: 21 }, phone: { x: 41, y: 76, w: 23 }, z: 1 },
  d2: { desktop: { x: 74, y: 76, w: 24 }, phone: { x: 71, y: 69, w: 27 }, z: 2 },
}

const RELATED: Slot[] = ['r1', 'r2', 'r3']
const DISTANT: Slot[] = ['d1', 'd2']

/** Rendered pixel size of each canonical asset (for next/image). */
const ASSET_SIZE = { Brand: [999, 1014], Experience: [917, 915], Technology: [1035, 1020], Creative: [958, 951], Discovery: [919, 909], Growth: [1015, 992] } as const

function placeStyle(p: Place, m: Place, extra?: CSSProperties): CSSProperties {
  return { '--dx': p.x, '--dy': p.y, '--dw': p.w, '--mx': m.x, '--my': m.y, '--mw': m.w, ...extra } as CSSProperties
}

/* Desktop bus (viewBox 0 0 100 97): trunk at x = 62 between the active module and the right column. */
const D = {
  trunk: 'M62 8V92',
  top: 'M23 8H59Q62 8 62 11',
  r1: 'M62 20H67.5',
  r2: 'M62 56H68',
  r3: 'M62 92H58',
  d2: 'M62 92H75.5',
  signal: 'M54.5 42H62',
  nodes: [[62, 11], [62, 20], [62, 56], [62, 92]],
}
/* Phone bus (viewBox 0 0 100 112): trunk at x = 61, bus runs under the active module. */
const P = {
  trunk: 'M61 10V70',
  top: '',
  r1: 'M61 17H64.5',
  r2: 'M61 48H65.5',
  r3: 'M61 70H22.5V73',
  d2: 'M61 70H85V72.5',
  d1: 'M52.5 70V77',
  signal: 'M53 36H61',
  nodes: [[61, 17], [61, 48], [61, 70]],
}

function ModuleImage({ entity, priority = false, sizes }: { entity: CapabilityEntity; priority?: boolean; sizes: string }) {
  const [w, h] = ASSET_SIZE[entity.module]
  return <Image src={MODULE_IMAGE[entity.module]} alt="" width={w} height={h} priority={priority} sizes={sizes} className={styles.art} draggable={false} />
}

interface CapabilityHeroSystemProps {
  /** Slug of the active capability (a key of CAPABILITY_ENTITIES). */
  activeSlug: string
  /** Accessible description of the composition. */
  label: string
  className?: string
}

export function CapabilityHeroSystem({ activeSlug, label, className }: CapabilityHeroSystemProps) {
  const active = (CAPABILITY_ENTITIES as Record<string, CapabilityEntity>)[activeSlug]
  if (!active) return null

  const related = active.adjacent.map((slug) => CAPABILITY_ENTITIES[slug])
  const distant = CAPABILITY_ORDER.filter((slug) => slug !== active.slug && !active.adjacent.includes(slug)).map((slug) => CAPABILITY_ENTITIES[slug])

  const satellites: { entity: CapabilityEntity; slot: Slot; level: 'related' | 'distant'; index: number }[] = [
    ...related.map((entity, i) => ({ entity, slot: RELATED[i], level: 'related' as const, index: i })),
    ...distant.map((entity, i) => ({ entity, slot: DISTANT[i], level: 'distant' as const, index: i + related.length })),
  ]

  return (
    <figure className={cn(styles.figure, className)} data-active={active.module}>
      <figcaption className="sr-only">{label}</figcaption>
      <div className={styles.stage}>
        <span aria-hidden="true" className={styles.bloom} />

        {/* Connection bus — decorative; the links below are the real navigation. */}
        <svg viewBox="0 0 100 104" aria-hidden="true" focusable="false" className={cn(styles.bus, styles.busDesktop)}>
          <path className={styles.trunk} d={D.trunk} pathLength={1} />
          <path className={cn(styles.lk, styles.lkTop)} d={D.top} pathLength={1} />
          <path className={cn(styles.lk, styles.lkR1)} d={D.r1} />
          <path className={cn(styles.lk, styles.lkR2)} d={D.r2} />
          <path className={cn(styles.lk, styles.lkR3)} d={D.r3} />
          <path className={cn(styles.lk, styles.lkD2)} d={D.d2} />
          <path className={styles.signal} d={D.signal} pathLength={1} />
          {D.nodes.map(([x, y]) => (
            <circle key={`${x}-${y}`} className={styles.node} cx={x} cy={y} r={0.95} />
          ))}
          <circle className={styles.signalNode} cx={62} cy={42} r={1.25} />
        </svg>
        <svg viewBox="0 0 100 112" aria-hidden="true" focusable="false" className={cn(styles.bus, styles.busPhone)}>
          <path className={styles.trunk} d={P.trunk} pathLength={1} />
          <path className={cn(styles.lk, styles.lkR1)} d={P.r1} />
          <path className={cn(styles.lk, styles.lkR2)} d={P.r2} />
          <path className={cn(styles.lk, styles.lkR3)} d={P.r3} />
          <path className={cn(styles.lk, styles.lkD2)} d={P.d2} />
          <path className={cn(styles.lk, styles.lkD1)} d={P.d1} />
          <path className={styles.signal} d={P.signal} pathLength={1} />
          {P.nodes.map(([x, y]) => (
            <circle key={`${x}-${y}`} className={styles.node} cx={x} cy={y} r={1.1} />
          ))}
          <circle className={styles.signalNode} cx={61} cy={36} r={1.5} />
        </svg>

        {/* Active capability — dominant, not a link (you are here). */}
        <div className={cn(styles.slot, styles.active)} style={placeStyle(ACTIVE.desktop, ACTIVE.phone)}>
          <div className={styles.activeFloat}>
            <span aria-hidden="true" className={styles.shadow} />
            <ModuleImage entity={active} priority sizes="(min-width: 1024px) 340px, 62vw" />
          </div>
          <p className={styles.activeTag} aria-current="page">
            <span aria-hidden="true" className={styles.activeDot} />
            <span className="sr-only">Current capability, </span>
            <span className={styles.activeName}>{active.name}</span>
          </p>
        </div>

        <ul className={styles.list}>
          {satellites.map(({ entity, slot, level, index }) => {
            const spec = SLOTS[slot]
            return (
              <li
                key={entity.slug}
                className={cn(styles.slot, styles[level], styles[slot])}
                style={placeStyle(spec.desktop, spec.phone, { '--z': spec.z, '--i': index } as CSSProperties)}
                data-slot={slot}
              >
                <Link href={entity.href} className={styles.link}>
                  <span className={styles.satFloat}>
                    <span aria-hidden="true" className={styles.shadow} />
                    <ModuleImage entity={entity} sizes="(min-width: 1024px) 200px, 36vw" />
                  </span>
                  <span className="sr-only">{entity.name}</span>
                  <span aria-hidden="true" className={styles.chip}>
                    {entity.name}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </figure>
  )
}
