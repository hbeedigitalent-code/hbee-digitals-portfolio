import Image from 'next/image'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { MODULE_IMAGE, type ModuleName } from './capability-entities'
import shared from '../capability/capability-hero-system.module.css'
import styles from './services-hero-system.module.css'

/**
 * SERVICES HERO SYSTEM — all six capabilities, one connected system.
 *
 * No capability is active, so no module outranks another: all six are the same
 * canonical render, full colour, with the same material. Spatial depth only —
 * some sit a little forward (larger, deeper shadow), some a little back — which
 * is placement, not importance. The Hbee mark is the hub: every channel runs
 * into it, and the one orange signal passes through it.
 *
 * Shares its visual grammar with CapabilityHeroSystem (bloom, shadows, rounded
 * orthogonal channels, nodes, signal, motion timing) but has its own
 * composition. Decorative: the capability information is HTML further down
 * the page, so the whole figure is aria-hidden-equivalent (labelled once).
 */

interface Place {
  x: number
  y: number
  w: number
}
interface ModuleSpec {
  module: ModuleName
  desktop: Place
  phone: Place
  /** Settle group (0–2): modules arrive in small groups. */
  group: 0 | 1 | 2
  /** Depth plane: 1 = forward, 0 = back. */
  depth: 0 | 1
}

const MODULES: ModuleSpec[] = [
  { module: 'Brand', desktop: { x: 4, y: 1, w: 30 }, phone: { x: 0, y: 0, w: 40 }, group: 0, depth: 0 },
  { module: 'Experience', desktop: { x: 58, y: 5, w: 32 }, phone: { x: 60, y: 4, w: 40 }, group: 0, depth: 0 },
  { module: 'Technology', desktop: { x: -2, y: 32, w: 35 }, phone: { x: -1, y: 40, w: 41 }, group: 1, depth: 1 },
  { module: 'Creative', desktop: { x: 67, y: 36, w: 32 }, phone: { x: 60, y: 45, w: 40 }, group: 1, depth: 0 },
  { module: 'Discovery', desktop: { x: 11, y: 65, w: 30 }, phone: { x: 0, y: 80, w: 40 }, group: 2, depth: 0 },
  { module: 'Growth', desktop: { x: 52, y: 63, w: 35 }, phone: { x: 60, y: 84, w: 41 }, group: 2, depth: 1 },
]

const ASSET_SIZE: Record<ModuleName, readonly [number, number]> = {
  Brand: [999, 1014],
  Experience: [917, 915],
  Technology: [1035, 1020],
  Creative: [958, 951],
  Discovery: [919, 909],
  Growth: [1015, 992],
}

const HUB = { desktop: { x: 38, y: 36, w: 24 }, phone: { x: 40, y: 50, w: 20 } }

/* Desktop channels (viewBox 0 0 100 98): one vertical spine through the hub,
   one horizontal orange signal through it. */
const D = {
  spineUp: 'M50 36V22',
  spineDown: 'M50 60V80',
  brand: 'M50 22H35',
  experience: 'M50 22H59',
  discovery: 'M50 80H42',
  growth: 'M50 80H55',
  signal: 'M31.5 48H68.5',
  nodes: [[50, 22], [50, 80], [31.5, 48], [68.5, 48]],
}
/* Phone channels (viewBox 0 0 100 120): a single spine, short stubs. */
const P = {
  spine: 'M50 22V100',
  brand: 'M50 22H38.5',
  experience: 'M50 22H61.5',
  discovery: 'M50 100H38.5',
  growth: 'M50 100H61.5',
  signal: 'M39 60H61',
  nodes: [[50, 22], [50, 100]],
}

function place(p: Place, m: Place): CSSProperties {
  return { '--dx': p.x, '--dy': p.y, '--dw': p.w, '--mx': m.x, '--my': m.y, '--mw': m.w } as CSSProperties
}

export function ServicesHeroSystem({ label, className }: { label: string; className?: string }) {
  return (
    <figure className={cn(shared.figure, styles.figure, className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <div className={styles.stage} aria-hidden="true">
        <span className={shared.bloom} />

        <div className={styles.scene}>
          {/* Channels — decorative, drawn behind the modules and hub. */}
          <svg viewBox="0 0 100 98" focusable="false" className={cn(shared.bus, shared.busDesktop)}>
            <path className={cn(shared.trunk, styles.chan)} d={D.spineUp} pathLength={1} />
            <path className={cn(shared.trunk, styles.chan)} d={D.spineDown} pathLength={1} />
            {[D.brand, D.experience, D.discovery, D.growth].map((d) => (
              <path key={d} className={shared.lk} d={d} />
            ))}
            <path className={shared.signal} d={D.signal} pathLength={1} />
            <path className={cn(styles.pulse, styles.pulseA)} d={D.signal} pathLength={1} />
            <path className={cn(styles.pulse, styles.pulseB)} d={`${D.spineDown}`} pathLength={1} />
            {D.nodes.map(([x, y]) => (
              <circle key={`${x}-${y}`} className={shared.node} cx={x} cy={y} r={0.95} />
            ))}
          </svg>
          <svg viewBox="0 0 100 120" focusable="false" className={cn(shared.bus, shared.busPhone)}>
            <path className={cn(shared.trunk, styles.chan)} d={P.spine} pathLength={1} />
            {[P.brand, P.experience, P.discovery, P.growth].map((d) => (
              <path key={d} className={shared.lk} d={d} />
            ))}
            <path className={shared.signal} d={P.signal} pathLength={1} />
            <path className={cn(styles.pulse, styles.pulseA)} d={P.signal} pathLength={1} />
            {P.nodes.map(([x, y]) => (
              <circle key={`${x}-${y}`} className={shared.node} cx={x} cy={y} r={1.1} />
            ))}
          </svg>

          {MODULES.map((m) => {
            const [w, h] = ASSET_SIZE[m.module]
            return (
              <div
                key={m.module}
                className={cn(styles.slot, styles.module, m.depth ? styles.forward : styles.back)}
                data-group={m.group}
                style={{ ...place(m.desktop, m.phone), '--z': m.depth ? 6 : 4 } as CSSProperties}
              >
                <span className={shared.shadow} />
                <Image src={MODULE_IMAGE[m.module]} alt="" width={w} height={h} loading="eager" sizes="(min-width: 1024px) 200px, 40vw" className={cn(shared.art, styles.art)} draggable={false} />
              </div>
            )
          })}

          {/* The Hbee mark — the connector. */}
          <div className={cn(styles.slot, styles.hub)} style={{ ...place(HUB.desktop, HUB.phone), '--z': 9 } as CSSProperties}>
            <span className={styles.hubHalo} />
            <span className={styles.hubDepth} />
            <span className={styles.hubFace}>
              <Image src="/svgs/logo.png" alt="" width={512} height={512} sizes="120px" className={styles.hubMark} draggable={false} />
            </span>
          </div>
        </div>
      </div>
    </figure>
  )
}
