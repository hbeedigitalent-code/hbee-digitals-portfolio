import Image from 'next/image'
import { cn } from '@/lib/cn'
import styles from './home-modules.module.css'

/**
 * Hero visual: the canonical, complete connected Hbee system (six modules,
 * central mark, connectors and nodes), supplied as one transparent asset.
 *
 * It is used whole, not rebuilt from the six individual module images: the
 * Hero's approved perspective only exists in this artwork, and it carries the
 * central mark, connectors and backing forms. The individual module images
 * (a different camera angle) are used for the dark "Growth rarely breaks"
 * section instead.
 *
 * The image is never stretched, filtered or recoloured. Motion only moves it
 * (one slow float) and pulses rings over the baked-in connector nodes.
 * Reduced motion: completely static.
 */

/** Connector-node centres, as % of the trimmed 1170 × 1109 artwork. */
const NODES: ReadonlyArray<readonly [number, number]> = [
  [2.5, 25.1],
  [48.0, 27.6],
  [92.9, 38.0],
  [11.4, 77.7],
  [49.1, 84.6],
  [90.3, 81.2],
]

export function HomeHeroSystem({ className }: { className?: string }) {
  return (
    <figure className={cn(styles.heroSystem, className)}>
      <div className={styles.heroFloat}>
        <Image
          src="/brand/modules/hbee-system.webp"
          alt="The Hbee system: Brand, Experience, Technology, Creative, Discovery and Growth, connected around the Hbee mark."
          width={1170}
          height={1109}
          priority
          sizes="(min-width: 1280px) 700px, (min-width: 1024px) 50vw, (min-width: 768px) 70vw, 92vw"
          className={styles.heroImage}
        />
        {NODES.map(([x, y], i) => (
          <span key={i} aria-hidden="true" className={styles.node} style={{ left: `${x}%`, top: `${y}%`, '--i': i } as React.CSSProperties} />
        ))}
      </div>
    </figure>
  )
}
