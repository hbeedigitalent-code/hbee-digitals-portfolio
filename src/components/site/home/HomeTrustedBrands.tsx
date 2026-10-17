import type { PublicTrustBrand } from '@/lib/trusted-brands'
import { SiteContainer } from '../primitives/SiteContainer'
import styles from './trusted-brands.module.css'

export const TRUST_MARQUEE_MIN = 6

export function HomeTrustedBrands({ brands }: { brands: PublicTrustBrand[] }) {
  if (!brands.length) return null
  const moving = brands.length >= TRUST_MARQUEE_MIN
  function group(duplicate = false) {
    return <ul className={styles.group} aria-hidden={duplicate || undefined}>
      {brands.map((brand, index) => {
        const image = <img src={brand.logo} alt={duplicate ? '' : brand.name} loading="lazy" decoding="async" className={styles.logo} />
        return <li key={index} className={styles.item}>
          {!duplicate && brand.url ? <a href={brand.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{image}</a> : image}
        </li>
      })}
    </ul>
  }
  return <section data-tone="white" aria-labelledby="home-trusted-brands-title" className={styles.band}>
    <SiteContainer>
      <h2 id="home-trusted-brands-title" className={styles.heading}>Selected brands we’ve supported</h2>
      <div className={moving ? styles.marquee : styles.static}>
        {moving && <><input id="pause-trusted-brands" type="checkbox" className={styles.pause} /><label htmlFor="pause-trusted-brands" className={styles.pauseLabel}>Pause logo motion</label></>}
        <div className={styles.viewport}>
          <div className={styles.track}>{group()}{moving && <div className={styles.duplicate} aria-hidden="true">{group(true)}</div>}</div>
        </div>
      </div>
    </SiteContainer>
  </section>
}
