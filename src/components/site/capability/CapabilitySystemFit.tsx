import type { CSSProperties } from 'react'
import { HbeeModuleStandalone } from '../module/HbeeModule'
import { DEFAULT_MODULE_ITEMS } from '../module/HbeeModuleGroup'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { relatedCapabilities, type CapabilityDetail } from './capability-content'
import { CAPABILITY_ICONS } from './capability-icons'
import styles from './capability.module.css'

/**
 * 05 — How it fits into the growth plan (White). The signature section.
 *
 * One connected diagram, not six cards: the featured capability's module →
 * one link (its orange Signal at the source) → a structural bus → the five
 * related capabilities as nodes, each with its group and what this
 * capability gives it. CONNECT plays once when revealed.
 *
 * Related capability names link to their existing detail pages; the overview
 * link still returns to the full system on the Services page.
 */
export function CapabilitySystemFit({ detail, name }: { detail: CapabilityDetail; name: string }) {
  const fit = detail.systemFit
  const related = relatedCapabilities(detail.slug)
  const featuredIcon = DEFAULT_MODULE_ITEMS.find((m) => m.label === detail.systemModule)?.icon

  return (
    <SiteSection tone="white" aria-labelledby="capability-fit-title">
      <SiteGrid className="gap-y-14">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5 min-[1152px]:self-center">
          <SiteReveal>
            <SiteEyebrow signal>How it fits into your growth plan</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-fit-title" size="h2" className="mt-6 max-w-[30rem]">
              {fit.headline} <span className="block text-hb-blue">{fit.headlineAccent}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{fit.copy}</p>
            <SiteLinkArrow href="/services#capabilities" className="mt-4 min-h-[44px]">
              Explore the full system
            </SiteLinkArrow>
          </SiteReveal>
        </div>

        <SiteReveal motion="none" className={`${styles.fit} col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7 min-[1152px]:self-center`}>
          <div className={styles.fitSource}>
            <HbeeModuleStandalone label={name} icon={featuredIcon} width={74} />
          </div>
          <span aria-hidden="true" className={styles.fitLink}>
            <span className={styles.fitSignal} />
          </span>
          <ul className={styles.fitNodes} aria-label={`Capabilities ${name} connects to`}>
            {related.map(({ capability, group }, i) => (
              <li key={capability.slug} className={styles.fitNode} style={{ '--hb-motion-index': i } as CSSProperties}>
                <span aria-hidden="true" className={styles.fitIcon}>
                  {CAPABILITY_ICONS[capability.icon]}
                </span>
                <div className="min-w-0">
                  <h3 className="font-hb-display text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-hb-fg">
                    <SiteLinkArrow href={`/services/${capability.slug}`} className="min-h-[44px]">
                      {capability.name}
                    </SiteLinkArrow>
                    <span className="sr-only">, </span>
                    <span className={styles.fitGroup}>{group.name}</span>
                  </h3>
                  {fit.relations[capability.slug] && (
                    <p className="mt-1 text-[0.9375rem] leading-relaxed text-hb-fg-body">{fit.relations[capability.slug]}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}
