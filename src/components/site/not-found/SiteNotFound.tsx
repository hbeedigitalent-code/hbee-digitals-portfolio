import { Unplug, Tag, Lightbulb } from 'lucide-react'
import { HbeeModuleStandalone } from '../module/HbeeModule'
import { SiteButton } from '../primitives/SiteButton'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { ALL_WORK_HREF } from '@/lib/site/routes'
import styles from './not-found.module.css'

/** Server-rendered error narrative; visual reconnection is optional CSS decoration. */
export function SiteNotFound() {
  return <section data-tone="night" className={styles.panel} aria-labelledby="not-found-title">
    <div className={`hb-container ${styles.layout}`}>
      <div className={styles.copy}>
        <SiteEyebrow signal>404 · Page not found</SiteEyebrow>
        <SiteDisplayHeading as="h1" size="h1" id="not-found-title" className="mt-6 max-w-xl">Looks like this <span className="text-hb-electric">connection broke.</span></SiteDisplayHeading>
        <SiteLede className="mt-6">We couldn’t find the page you’re looking for. It may have moved, been renamed, or never been connected to our system.</SiteLede>
        <div className="mt-8 flex flex-wrap gap-3">
          <SiteButton href="/" variant="conversion" size="lg" arrow>Return Home</SiteButton>
          <SiteButton href={ALL_WORK_HREF} variant="secondary" size="lg">Explore Our Work</SiteButton>
        </div>
      </div>
      <div className={styles.system} aria-hidden="true">
        <svg viewBox="0 0 100 90" className={styles.connections} focusable="false">
          <path d="M61 21V35M68 47V65" fill="none" stroke="var(--hb-electric)" strokeWidth="0.6" />
          <path className={styles.broken} d="M30 43H42Q46 43 46 47V49Q46 53 50 53H65" pathLength="100" fill="none" stroke="var(--hb-orange)" strokeWidth="0.8" />
          <circle cx="30" cy="43" r="1.5" fill="var(--hb-orange)" />
          <circle cx="65" cy="53" r="1.2" fill="var(--hb-electric)" />
        </svg>
        <div className={styles.brokenNode}><HbeeModuleStandalone width={76} label="404" icon={<Unplug />} sweep="tr" signal /></div>
        <div className={styles.brand}><img src="/svgs/logo.png" width="128" height="128" alt="" /></div>
        <div className={styles.brandNode}><HbeeModuleStandalone width={76} label="Brand" icon={<Tag />} sweep="tr" /></div>
        <div className={styles.creativeNode}><HbeeModuleStandalone width={76} label="Creative" icon={<Lightbulb />} /></div>
      </div>
    </div>
  </section>
}
