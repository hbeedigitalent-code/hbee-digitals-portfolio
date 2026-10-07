import type { CSSProperties, ReactNode } from 'react'
import { BarChart3, Boxes, Lightbulb, MapPin, Settings2, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { HbeeModule, HbeeModuleGlyph, type ModuleSweep } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteImage } from '../primitives/SiteImage'
import { ABOUT_HERO, HERO_MODULES, REACH, THINKING, type ModuleConcept } from './about-content'
import { ABUJA, LAND_PATH, REGION_SCENE, WEST_AFRICA_PATH, WORLD_SCENE, project, routePath, type MapScene as MapSceneData } from './world-map'
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
          ? `Members of the Hbee Digitals team, connected by the Hbee system: people, strategy, systems and impact.`
          : 'The Hbee system: people, strategy, systems and impact, connected.'}
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

/* ═════════════════════════════════════════════════════════════════
   HOW WE THINK — three connected ideas around one Hbee point.
   A philosophy, not the five-stage process. Labels are real HTML over the
   drawing. CONNECT (circles draw) → FOCUS (hub) → one SIGNAL around the
   whole, once. Reduced motion: complete drawing, no signal travel.
   ═════════════════════════════════════════════════════════════════ */

const THINK_ICONS: Record<(typeof THINKING.nodes)[number]['key'], ReactNode> = {
  strategy: <Lightbulb {...ICON} />,
  implementation: <Settings2 {...ICON} />,
  growth: <BarChart3 {...ICON} />,
}

export function ConnectedThinking({ className }: { className?: string }) {
  return (
    <SiteReveal motion="none" as="figure" className={cn(styles.think, className)}>
      <figcaption className="sr-only">
        Strategy, implementation and growth shown as three overlapping circles joined at one Hbee connection point.
      </figcaption>
      <svg viewBox="0 0 400 340" aria-hidden="true" focusable="false" className={styles.thinkSvg}>
        <circle className={styles.thinkOrbit} cx="200" cy="180" r="150" fill="none" />
        {[
          [200, 110],
          [122, 236],
          [278, 236],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            data-connect=""
            style={{ '--hb-motion-index': i * 2 } as CSSProperties}
            className={styles.thinkCircle}
            cx={cx}
            cy={cy}
            r="92"
            pathLength={1}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <circle className={styles.thinkSignal} cx="200" cy="180" r="150" fill="none" pathLength={1} transform="rotate(-90 200 180)" />
      </svg>
      <ul className={styles.thinkNodes}>
        {THINKING.nodes.map((node, i) => (
          <li key={node.key} data-motion="reveal" className={styles.thinkNode} data-node={node.key} style={{ '--hb-motion-index': i + 1 } as CSSProperties}>
            <span aria-hidden="true" className={styles.thinkIcon}>
              {THINK_ICONS[node.key]}
            </span>
            <h3 className={styles.thinkName}>{node.name}</h3>
            <p className={styles.thinkText}>{node.text}</p>
          </li>
        ))}
      </ul>
      <span aria-hidden="true" data-motion="focus" className={styles.thinkHub} style={{ '--hb-motion-index': 6 } as CSSProperties}>
        <HbeeModuleGlyph signal="none" className={styles.thinkHubGlyph} />
      </span>
    </SiteReveal>
  )
}

/* ═════════════════════════════════════════════════════════════════
   REACH — a stylised world map. Rooted in West Africa, working beyond
   borders: the home region is highlighted, Abuja, Nigeria (Hbee's real
   base) is the anchor, and routes extend outward to unlabelled points in
   other world regions. Those points are ILLUSTRATIVE — not offices,
   clients or project locations — and the visual says so in plain text.
   No photograph: no verified Abuja image is available.

   Two framings of the same map: the world (≥640px) and a regional frame
   on Africa, Europe and the Gulf for phones. Each SVG's box matches its
   wrapper's aspect ratio exactly (no slice), so nothing is ever cropped.

   Motion (CSS, gated on data-motion-ready, on reveal): the home region
   lights → Abuja pulses → routes draw outward one by one → a signal
   travels each route once and the point it reaches activates → the other
   points activate. After the sequence the only movement is a slow beacon
   at Abuja (the one deliberate loop on the page). Reduced motion: the
   final state — every route drawn, every point lit, no beacon.
   ═════════════════════════════════════════════════════════════════ */

const pct = (v: number, start: number, size: number) => `${(((v - start) / size) * 100).toFixed(2)}%`

function MapScene({ scene, id, className }: { scene: MapSceneData; id: string; className: string }) {
  const [bx, by, bw, bh] = scene.box
  const [ax, ay] = project(ABUJA)
  const [lx, ly] = project(scene.regionLabel)
  const routes = scene.points.filter((p) => p.route)
  const others = scene.points.filter((p) => !p.route)
  const anchor = { '--ax': pct(ax, bx, bw), '--ay': pct(ay, by, bh) } as CSSProperties

  return (
    <div className={cn(styles.mapScene, className)} style={{ aspectRatio: `${bw} / ${bh}` }}>
      <svg viewBox={scene.box.join(' ')} aria-hidden="true" focusable="false" className={styles.mapSvg}>
        <defs>
          <pattern id={`${id}-dots`} width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.42" fill="#cfe0ff" />
          </pattern>
          <pattern id={`${id}-home`} width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.55" fill="#4d8dff" />
          </pattern>
          <clipPath id={`${id}-land`}>
            <path d={LAND_PATH} />
          </clipPath>
          <clipPath id={`${id}-wa`}>
            <path d={WEST_AFRICA_PATH} />
          </clipPath>
          <radialGradient id={`${id}-halo`}>
            <stop offset="0" stopColor="#1d6eff" stopOpacity="0.38" />
            <stop offset="1" stopColor="#1d6eff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Graticule — the globe's grid, very faint */}
        <g className={styles.mapGrid}>
          {[-120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
            <line key={lon} x1={lon + 180} x2={lon + 180} y1={by} y2={by + bh} />
          ))}
          {[60, 30, 0, -30].map((lat) => (
            <line key={lat} x1={bx} x2={bx + bw} y1={75 - lat} y2={75 - lat} className={lat === 0 ? styles.mapEquator : undefined} />
          ))}
        </g>

        <ellipse className={styles.mapHalo} cx={ax - 4} cy={ay - 3} rx="26" ry="18" fill={`url(#${id}-halo)`} />
        <rect x={bx} y={by} width={bw} height={bh} fill={`url(#${id}-dots)`} clipPath={`url(#${id}-land)`} className={styles.mapLand} />
        <g clipPath={`url(#${id}-land)`}>
          <rect x={bx} y={by} width={bw} height={bh} fill={`url(#${id}-home)`} clipPath={`url(#${id}-wa)`} className={styles.mapHome} />
        </g>

        {routes.map((p, i) => (
          <path key={`r${i}`} className={styles.mapRoute} d={routePath(p.at)} pathLength={1} style={{ '--i': i } as CSSProperties} />
        ))}
        {routes.map((p, i) => (
          <path key={`s${i}`} className={styles.mapSignal} d={routePath(p.at)} pathLength={1} style={{ '--i': i } as CSSProperties} />
        ))}
        {scene.points.map((p, i) => {
          const [x, y] = project(p.at)
          const order = p.route ? routes.indexOf(p) : routes.length + others.indexOf(p)
          return (
            <g key={`n${i}`} className={cn(styles.mapPoint, !p.route && styles.mapPointQuiet)} style={{ '--i': order } as CSSProperties}>
              <circle className={styles.mapPointRing} cx={x} cy={y} r="1.6" />
              <circle className={styles.mapPointCore} cx={x} cy={y} r="0.85" />
            </g>
          )
        })}

        <circle className={styles.mapBeacon} cx={ax} cy={ay} r="2" />
        <circle className={styles.mapPulse} cx={ax} cy={ay} r="2" />
        <circle cx={ax} cy={ay} r="2" fill="none" stroke="#cfe0ff" strokeOpacity="0.6" strokeWidth="0.35" />
        <circle cx={ax} cy={ay} r="1.1" fill="#1d6eff" stroke="#ffffff" strokeWidth="0.45" />
      </svg>

      <span aria-hidden="true" className={cn(styles.mapRegion, scene.regionAlign === 'end' && styles.mapRegionEnd)} style={{ left: pct(lx, bx, bw), top: pct(ly, by, bh) }}>
        West Africa
      </span>
      <span aria-hidden="true" className={styles.mapAnchor} style={anchor}>
        <span className={styles.mapAnchorPin}>
          <MapPin {...ICON} />
        </span>
        {REACH.location.name}
      </span>
    </div>
  )
}

export function ReachField({ className }: { className?: string }) {
  return (
    <SiteReveal motion="none" as="figure" className={cn(styles.reach, className)}>
      <figcaption className="sr-only">
        A stylised world map. Hbee’s home base, Abuja, Nigeria, is highlighted within West Africa, with connections extending outward to
        other regions of the world. The distant points are illustrative, not office or client locations.
      </figcaption>
      <MapScene scene={WORLD_SCENE} id="about-map-world" className={styles.mapWorld} />
      <MapScene scene={REGION_SCENE} id="about-map-region" className={styles.mapRegionScene} />
      <div className={styles.reachFoot}>
        <p aria-hidden="true" className={styles.mapLegend}>
          <span className={styles.mapLegendItem}>
            <span className={styles.mapLegendHome} /> Home base
          </span>
          <span className={styles.mapLegendItem}>
            <span className={styles.mapLegendPoint} /> Illustrative reach — not client or office locations
          </span>
        </p>
        <div className={styles.reachCards}>
          <div data-motion="reveal" className={styles.reachLocation} style={{ '--hb-motion-index': 2 } as CSSProperties}>
            <span aria-hidden="true" className={styles.reachPin}>
              <MapPin {...ICON} />
            </span>
            <div>
              <p className={styles.reachLocationName}>{REACH.location.name}</p>
              <p className={styles.reachLocationText}>{REACH.location.text}</p>
            </div>
          </div>
          <div data-motion="reveal" className={styles.reachMindset} style={{ '--hb-motion-index': 4 } as CSSProperties}>
            <p className={styles.reachMindsetTitle}>
              {REACH.card.headline.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </p>
            <p className={styles.reachMindsetText}>{REACH.card.text}</p>
          </div>
        </div>
      </div>
    </SiteReveal>
  )
}
