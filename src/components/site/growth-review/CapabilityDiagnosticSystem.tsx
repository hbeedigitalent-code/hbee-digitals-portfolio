import Image from 'next/image'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { roundedPath, type Pt } from '../module/route-geometry'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER, MODULE_IMAGE, type ModuleName } from '../services/capability-entities'
import styles from './diagnostic-hero.module.css'

/**
 * CAPABILITY DIAGNOSTIC SYSTEM — the Growth Review hero visual (S3.1).
 *
 * The connected Hbee system being examined to find where a constraint may sit.
 * It uses the six canonical module renders (public/brand/modules/*.webp) as
 * supplied: never redrawn, relabeled, recoloured, rotated or stretched. Only
 * placement, uniform scale, layering and ground shadow vary.
 *
 * It is deliberately NOT the Services hero: the composition is asymmetric, the
 * Hbee hub sits off-centre like a lens over the system, modules sit at
 * different scales and depths, and a quiet scan sends a signal from the hub to
 * ONE module at a time. Depth is placement only; it never ranks a capability.
 * There are no numbers, scores or "6 of 6": the figure means "the diagnosis may
 * point into any part of the system".
 *
 * Variants
 *   hero      introduction: modules settle → channels draw → the scan runs
 *             (one slow cycle, restrained), CSS only, gated on data-motion-ready.
 *   received  confirmation: settled, channels complete, nodes filled, the hub's
 *             orange signal lit. No scan.
 *   idle      direct-visit recovery: the system at rest, dashed channels,
 *             hollow nodes, NO orange signal anywhere. Never reads as success.
 * Reduced motion: the settled system, no scan.
 *
 * Three compositions: desktop 100 × 104, tablet (viewport 640–1023px) 100 × 98,
 * phone (container ≤ 440px): hub above, a 2 × 3 grid below, short stubs.
 */

export type DiagnosticVariant = 'hero' | 'received' | 'idle'

/** Intrinsic size of each trimmed render. */
const ASSET_SIZE: Record<ModuleName, readonly [number, number]> = {
  Brand: [999, 1014],
  Experience: [917, 915],
  Technology: [1035, 1020],
  Creative: [958, 951],
  Discovery: [919, 909],
  Growth: [1015, 992],
}

interface Box { x: number; y: number; w: number }
interface Layout {
  height: number
  boxes: Record<ModuleName, Box>
  hub: Box
  paths: Record<ModuleName, readonly Pt[]>
}

const DESKTOP: Layout = {
  height: 104,
  hub: { x: 27, y: 41, w: 22 },
  boxes: {
    Brand: { x: 2, y: 4, w: 26 },
    Experience: { x: 32, y: 0, w: 22 },
    Creative: { x: 70, y: 6, w: 30 },
    Technology: { x: 54, y: 40, w: 34 },
    Discovery: { x: 28, y: 70, w: 28 },
    Growth: { x: 66, y: 78, w: 24 },
  },
  paths: {
    Brand: [[31, 41], [31, 17], [28, 17]],
    Experience: [[38, 41], [38, 22]],
    Creative: [[45, 41], [45, 28], [70, 28]],
    Technology: [[49, 52], [54, 52]],
    Discovery: [[38, 63], [38, 70]],
    Growth: [[44, 63], [44, 84], [66, 84]],
  },
}

const TABLET: Layout = {
  height: 98,
  hub: { x: 27, y: 38, w: 23 },
  boxes: {
    Brand: { x: 4, y: 4, w: 25 },
    Experience: { x: 33, y: 0, w: 22 },
    Creative: { x: 68, y: 6, w: 30 },
    Technology: { x: 54, y: 36, w: 33 },
    Discovery: { x: 27, y: 67, w: 28 },
    Growth: { x: 63, y: 72, w: 25 },
  },
  paths: {
    Brand: [[31, 38], [31, 16], [29, 16]],
    Experience: [[38, 38], [38, 22]],
    Creative: [[45, 38], [45, 26], [68, 26]],
    Technology: [[50, 49], [54, 49]],
    Discovery: [[38, 61], [38, 67]],
    Growth: [[44, 61], [44, 80], [63, 80]],
  },
}

/* Phone: hub above, 2 × 3 grid of equal canonical renders, a spine between the columns with short stubs. */
const PHONE: Layout = {
  height: 152,
  hub: { x: 33, y: 2, w: 34 },
  boxes: {
    Brand: { x: 5, y: 40, w: 38 },
    Experience: { x: 57, y: 40, w: 38 },
    Technology: { x: 5, y: 76, w: 38 },
    Creative: { x: 57, y: 76, w: 38 },
    Discovery: { x: 5, y: 112, w: 38 },
    Growth: { x: 57, y: 112, w: 38 },
  },
  paths: {
    Brand: [[50, 36], [50, 58.6], [43, 58.6]],
    Experience: [[50, 36], [50, 58.6], [57, 58.6]],
    Technology: [[50, 36], [50, 94.6], [43, 94.6]],
    Creative: [[50, 36], [50, 94.6], [57, 94.6]],
    Discovery: [[50, 36], [50, 130.6], [43, 130.6]],
    Growth: [[50, 36], [50, 130.6], [57, 130.6]],
  },
}

/** Depth is placement only. Forward modules get a deeper ground shadow; none is recoloured, softened or rotated. */
const DEPTH: Record<ModuleName, 'fwd' | 'mid' | 'back'> = {
  Brand: 'back',
  Experience: 'back',
  Creative: 'fwd',
  Technology: 'fwd',
  Discovery: 'mid',
  Growth: 'mid',
}
const Z: Record<ModuleName, number> = { Brand: 3, Experience: 2, Creative: 6, Technology: 7, Discovery: 4, Growth: 4 }

/** The scan visits the modules in an order that is deliberately not their reading order. */
const SCAN_ORDER: ModuleName[] = ['Creative', 'Discovery', 'Brand', 'Technology', 'Growth', 'Experience']
const MODULES = CAPABILITY_ORDER.map((slug) => CAPABILITY_ENTITIES[slug].module) as ModuleName[]
const NAMES = CAPABILITY_ORDER.map((slug) => CAPABILITY_ENTITIES[slug].name).join(', ')

const CAPTIONS: Record<DiagnosticVariant, string> = {
  hero: `The connected Hbee system being examined: ${NAMES}. The diagnosis may point into any part of it.`,
  received: 'Your answers, received into the Hbee review.',
  idle: 'The connected Hbee system at rest: the diagnosis may point into any part of it.',
}

function slotStyle(m: ModuleName, i: number): CSSProperties {
  const d = DESKTOP.boxes[m]
  const t = TABLET.boxes[m]
  const p = PHONE.boxes[m]
  return {
    '--dx': d.x,
    '--dy': d.y,
    '--dw': d.w,
    '--tx': t.x,
    '--ty': t.y,
    '--tw': t.w,
    '--mx': p.x,
    '--my': p.y,
    '--mw': p.w,
    '--z': Z[m],
    '--i': i,
    '--k': SCAN_ORDER.indexOf(m),
  } as CSSProperties
}

function hubStyle(): CSSProperties {
  return {
    '--dx': DESKTOP.hub.x,
    '--dy': DESKTOP.hub.y,
    '--dw': DESKTOP.hub.w,
    '--tx': TABLET.hub.x,
    '--ty': TABLET.hub.y,
    '--tw': TABLET.hub.w,
    '--mx': PHONE.hub.x,
    '--my': PHONE.hub.y,
    '--mw': PHONE.hub.w,
  } as CSSProperties
}

function Channels({ layout, className }: { layout: Layout; className: string }) {
  return (
    <svg viewBox={`0 0 100 ${layout.height}`} aria-hidden="true" focusable="false" className={cn(styles.bus, className)}>
      {MODULES.map((m) => (
        <path key={m} className={styles.channel} d={roundedPath(layout.paths[m], 2)} pathLength={1} fill="none" />
      ))}
      {SCAN_ORDER.map((m, k) => (
        <path key={m} className={styles.pulse} d={roundedPath(layout.paths[m], 2)} pathLength={1} fill="none" style={{ '--k': k } as CSSProperties} />
      ))}
      {SCAN_ORDER.map((m, k) => {
        const p = layout.paths[m]
        const [sx, sy] = p[0]
        const [ex, ey] = p[p.length - 1]
        return (
          <g key={m} style={{ '--k': k } as CSSProperties}>
            <circle className={styles.node} cx={sx} cy={sy} r={0.9} />
            <circle className={cn(styles.node, styles.nodeEnd)} cx={ex} cy={ey} r={1} />
          </g>
        )
      })}
    </svg>
  )
}

export function CapabilityDiagnosticSystem({ variant = 'hero', className }: { variant?: DiagnosticVariant; className?: string }) {
  return (
    <figure className={cn(styles.figure, className)} data-variant={variant}>
      <figcaption className="sr-only">{CAPTIONS[variant]}</figcaption>
      <div className={styles.stage} aria-hidden="true">
        <span className={styles.bloom} />

        <div className={styles.scene}>
          <Channels layout={DESKTOP} className={styles.busDesktop} />
          <Channels layout={TABLET} className={styles.busTablet} />
          <Channels layout={PHONE} className={styles.busPhone} />

          {MODULES.map((m, i) => {
            const [w, h] = ASSET_SIZE[m]
            return (
              <div key={m} className={cn(styles.slot, styles.module, styles[DEPTH[m]])} style={slotStyle(m, i)} data-module={m.toLowerCase()}>
                <span className={styles.shadow} />
                <span className={styles.lift}>
                  <Image
                    src={MODULE_IMAGE[m]}
                    alt=""
                    width={w}
                    height={h}
                    loading="eager"
                    sizes="(min-width: 1024px) 200px, 40vw"
                    className={styles.art}
                    draggable={false}
                  />
                </span>
              </div>
            )
          })}

          {/* The Hbee mark as the diagnostic hub — a lens over the system, off-centre. */}
          <div className={cn(styles.slot, styles.hub)} style={hubStyle()}>
            <span className={styles.hubHalo} />
            <span className={styles.hubDepth} />
            <span className={styles.hubFace}>
              <Image src="/svgs/logo.png" alt="" width={512} height={512} sizes="120px" className={styles.hubMark} draggable={false} />
            </span>
            {variant === 'received' && <span className={styles.hubSignal} />}
          </div>
        </div>
      </div>
    </figure>
  )
}
