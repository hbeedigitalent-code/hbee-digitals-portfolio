import type { CSSProperties } from 'react'
import type { PublicTrustBrand } from '@/lib/trusted-brands'
import { SiteContainer } from '../primitives/SiteContainer'
import styles from './trusted-brands.module.css'

export const TRUST_SEQUENCE_MIN = 8

export function HomeTrustedBrands({ brands }: { brands: PublicTrustBrand[] }) {
  if (!brands.length) return null
  // Each visual sequence fills the widest site container, even with one logo.
  // Only the first occurrence of each stored brand is accessible/interactive.
  const sequence = Array.from({ length: Math.ceil(TRUST_SEQUENCE_MIN / brands.length) }, () => brands).flat()
  function group(duplicate = false) {
    return <ul className={styles.group} aria-hidden={duplicate || undefined}>
      {sequence.map((brand, index) => {
        const copy = duplicate || index >= brands.length
        const image = <img src={brand.logo} alt={copy ? '' : brand.name} loading="lazy" decoding="async" className={styles.logo} />
        return <li key={index} className={`${styles.item}${index >= brands.length ? ` ${styles.copy}` : ''}`} aria-hidden={copy || undefined}>
          {!copy && brand.url ? <a href={brand.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{image}</a> : image}
        </li>
      })}
    </ul>
  }
  return <section data-tone="white" aria-labelledby="home-trusted-brands-title" className={styles.band}>
    <SiteContainer>
      <h2 id="home-trusted-brands-title" className={styles.heading}>Selected brands we’ve supported</h2>
      <div className={styles.marquee} style={{ '--trust-duration': `${sequence.length * 10}s` } as CSSProperties}>
        <input id="pause-trusted-brands" type="checkbox" className={styles.pause} /><label htmlFor="pause-trusted-brands" className={styles.pauseLabel}>Pause logo motion</label>
        <div className={styles.viewport}>
          <div className={styles.track}>{group()}<div className={styles.duplicate} aria-hidden="true">{group(true)}</div></div>
        </div>
      </div>
    </SiteContainer>
  </section>
}
