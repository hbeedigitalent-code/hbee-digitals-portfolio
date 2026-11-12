import type { CSSProperties, ReactNode } from 'react'
import { BarChart3, Boxes, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { HbeeModule, HbeeModuleGlyph, type ModuleSweep } from '../module/HbeeModule'
import { SiteImage } from '../primitives/SiteImage'
import { ABOUT_HERO, HERO_MODULES, type ModuleConcept } from './about-content'
import styles from './about.module.css'

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%', 'aria-hidden': true, focusable: false } as const

/* ═════════════════════════════════════════════════════════════════
   HERO — PEOPLE SYSTEM
   People are the primary focus: three layered photo frames carry REAL team
   portraits from the CMS (never stock or generated faces). A frame without
   a real photo shows a restrained branded plane instead — it never pretends
   to be a person. Four small dimensional modules and thin paths add the
   Hbee system language around them.

   Coordinates: desktop stage 100 × 84, phones (container ≤ 400px) 100 × 100.
   Modules are 0.86 × their width tall, so path endpoints meet module edges.
   Motion (CSS, gated on data-motion-ready, plays once on load):
   REVEAL main photo → SHIFT supporting frames → ASSEMBLE modules →
   CONNECT paths → one orange SIGNAL → SETTLE. Reduced motion: final state.
   ═════════════════════════════════════════════════════════════════ */

export interface HeroPhoto {
  src: string
  alt: string
}

interface Box {
  x: number
  y: number
  w: number
  h?: number
}
type Placed = { d: Box; m: Box }

const FRAMES: Placed[] = [
  { d: { x: 12, y: 13, w: 52, h: 45 }, m: { x: 8, y: 14, w: 58, h: 48 } },
  { d: { x: 70, y: 4, w: 22, h: 27 }, m: { x: 62, y: 4, w: 30, h: 30 } },
  { d: { x: 58, y: 36, w: 20, h: 24 }, m: { x: 52, y: 42, w: 22, h: 26 } },
]

const MODULE_SLOTS: Record<ModuleConcept, Placed & { sweep: ModuleSweep; glass?: boolean }> = {
  people: { d: { x: 2, y: 46, w: 22 }, m: { x: 1, y: 56, w: 27 }, sweep: 'br', glass: true },
  strategy: { d: { x: 50, y: 1, w: 16 }, m: { x: 38, y: 0, w: 22 }, sweep: 'tr' },
  systems: { d: { x: 81, y: 34, w: 16 }, m: { x: 75, y: 38, w: 23 }, sweep: 'br' },
  impact: { d: { x: 44, y: 63, w: 15 }, m: { x: 44, y: 76, w: 21 }, sweep: 'tr' },
}

const MODULE_ICONS: Record<ModuleConcept, ReactNode> = {
  people: <Users {...ICON} />,
  strategy: <BarChart3 {...ICON} />,
  systems: <Boxes {...ICON} />,
  impact: <TrendingUp {...ICON} />,
}

/* Paths run through the gaps (people → impact, impact → systems, strategy → frame, frame → systems). */
const PATHS = { d: ['M24 58H34V69.5H44', 'M66 8H70', 'M92 20H94V34'], m: ['M28 70H36V85H44', 'M60 9H62', 'M92 20H95V38'] }
const SIGNAL = { d: 'M59 69.5H89V47.8', m: 'M65 85H86V57.8' }

function placeStyle({ d, m }: Placed, i: number) {
  return {
    '--dx': d.x,
    '--dy': d.y,
    '--dw': d.w,
    '--dh': d.h ?? d.w * 0.86,
    '--mx': m.x,
    '--my': m.y,
    '--mw': m.w,
    '--mh': m.h ?? m.w * 0.86,
    '--hb-motion-index': i,
  } as CSSProperties
}

function RouteSet({ paths, signal, viewBox, className }: { paths: string[]; signal: string; viewBox: string; className: string }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false" className={cn(styles.heroPaths, className)}>
      {paths.concat(signal).map((d) => (
        <path key={d} className={styles.heroPath} d={d} pathLength={1} fill="none" />
      ))}
      <path className={styles.heroSignal} d={signal} pathLength={1} fill="none" />
    </svg>
  )
}

export function AboutPeopleSystem({ photos, className }: { photos: HeroPhoto[]; className?: string }) {
  return (
    <figure className={cn(styles.people, className)}>
      <figcaption className="sr-only">
        {photos.length
          ? `Members of the Hbee Digitals team, connected by the Hbee system: people, strategy, systems and growth.`
          : 'The Hbee system: people, strategy, systems and growth, connected.'}
      </figcaption>
      <div className={styles.peopleStage}>
        {FRAMES.map((frame, i) => {
          const photo = photos[i]
          return (
            <div key={i} className={cn(styles.frame, i === 0 ? styles.frameMain : styles.frameSide)} style={placeStyle(frame, i)} data-frame={i}>
              {photo ? (
                <SiteImage
                  src={photo.src}
                  alt={photo.alt}
                  sizes={i === 0 ? '(min-width: 1024px) 30vw, 60vw' : '(min-width: 1024px) 13vw, 30vw'}
                  priority={i === 0}
                  className={styles.framePhoto}
                />
              ) : (
                <span aria-hidden="true" className={styles.framePlane}>
                  <HbeeModuleGlyph signal="none" className={styles.framePlaneGlyph} />
                </span>
              )}
            </div>
          )
        })}

        <RouteSet paths={PATHS.d} signal={SIGNAL.d} viewBox="0 0 100 84" className={styles.heroPathsDesktop} />
        <RouteSet paths={PATHS.m} signal={SIGNAL.m} viewBox="0 0 100 100" className={styles.heroPathsMobile} />
        <span aria-hidden="true" className={styles.heroNode} />

        <ul className={styles.heroModules}>
          {HERO_MODULES.map((mod, i) => {
            const slot = MODULE_SLOTS[mod.key]
            return (
              <li key={mod.key} className={styles.heroSlot} style={placeStyle(slot, i)}>
                <div className={styles.heroSlotStage}>
                  <HbeeModule label={mod.label} icon={MODULE_ICONS[mod.key]} sweep={slot.sweep} glass={slot.glass} />
                </div>
              </li>
            )
          })}
        </ul>

        <p aria-hidden="true" className={styles.heroCaption}>
          {ABOUT_HERO.caption.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>
    </figure>
  )
}
