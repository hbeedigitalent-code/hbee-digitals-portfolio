import type { CSSProperties } from 'react'
import type { PublicTrustBrand } from '@/lib/trusted-brands'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteContainer } from '../primitives/SiteContainer'
import { MarqueeFocusGuard } from './MarqueeFocusGuard'
import styles from './trusted-brands.module.css'

export const TRUST_SEQUENCE_MIN = 8

/**
 * Selected brands we've supported. One continuous, seamless CSS marquee (transform only, constant speed on every
 * viewport). The strip is duplicated once (the copy is aria-hidden and has no links) so the loop has no seam.
 *
 * Accessibility: there is no always-visible pause control. A native checkbox ("Pause logo motion") is the FIRST tab stop
 * in the section and is visually hidden until it receives keyboard focus, so ordinary pointer and touch visitors never
 * see it; it works without JavaScript. Hover and keyboard focus also pause the track in place (never restart it).
 * Reduced motion: no animation, no duplicate, no control: a static, manually scrollable strip.
 */
export function HomeTrustedBrands({ brands }: { brands: PublicTrustBrand[] }) {
  if (!brands.length) return null
  // Each visual sequence fills the widest site container, even with one logo.
  // Only the first occurrence of each stored brand is accessible/interactive.
  const sequence = Array.from({ length: Math.ceil(TRUST_SEQUENCE_MIN / brands.length) }, () => brands).flat()
  function group(duplicate = false) {
    return <ul className={styles.group} aria-hidden={duplicate || undefined}>
      {sequence.map((brand, index) => {
        const copy = duplicate || index >= brands.length
        // Eager: a lazy image clipped off the right edge of a moving strip would pop in as it scrolls into view.
        const image = <img src={brand.logo} alt={copy ? '' : brand.alt || brand.name} loading="eager" decoding="async" className={styles.logo} />
        return <li key={index} className={`${styles.item}${index >= brands.length ? ` ${styles.copy}` : ''}`} aria-hidden={copy || undefined}>
          {!copy && brand.url ? <a href={brand.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{image}</a> : image}
        </li>
      })}
    </ul>
  }
  return <section data-tone="white" aria-labelledby="home-trusted-brands-title" className={styles.band}>
    <SiteContainer>
      <SiteReveal motion="none">
        <h2 id="home-trusted-brands-title" data-motion="soft" className={styles.heading}>Selected brands we’ve supported</h2>
        <div data-motion="soft" style={{ '--hb-motion-index': 1 } as CSSProperties}>
          <div className={styles.marquee} data-marquee="" style={{ '--trust-duration': `${sequence.length * 10}s` } as CSSProperties}>
            <input id="pause-trusted-brands" type="checkbox" className={styles.pause} /><label htmlFor="pause-trusted-brands" className={styles.pauseLabel}>Pause logo motion</label>
            {/* A horizontally scrollable region must be reachable by keyboard (reduced motion = manual scroll). */}
            <div className={styles.viewport} data-marquee-viewport="" role="region" aria-label="Brand logos" tabIndex={0}>
              <div className={styles.track} data-marquee-track="">{group()}<div className={styles.duplicate} aria-hidden="true">{group(true)}</div></div>
            </div>
            <MarqueeFocusGuard />
          </div>
        </div>
      </SiteReveal>
    </SiteContainer>
  </section>
}
