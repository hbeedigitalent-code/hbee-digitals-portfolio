import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteLede } from '../primitives/SiteTypography'
import { GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import type { CapabilityDetail } from './capability-content'
import { CapabilityFocusSystem } from './CapabilityFocusSystem'
import homeStyles from '../home/home.module.css'
import styles from './capability.module.css'

/**
 * 01 — Capability hero. Same Cloud field, grid and eyebrow grammar as the
 * homepage and Services heroes; the visual features this capability's
 * module inside the Hbee system. Text is server-rendered and visible
 * immediately (LCP). Mobile: eyebrow → headline → copy → CTAs → system.
 */
export function CapabilityHero({ detail, name }: { detail: CapabilityDetail; name: string }) {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="capability-hero-title" className="overflow-hidden">
      <div aria-hidden="true" className={homeStyles.heroField}>
        <svg className={homeStyles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>

      <SiteGrid className={`items-center gap-y-12 pb-[var(--hb-space-section-compact)] pt-[clamp(2.5rem,5vw,4.5rem)] lg:pt-12 ${styles.heroGrid} ${detail.hero.longHeadline ? styles.heroLong : ''}`}>
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            {['Services', name].map((word, i) => (
              <span key={word} className={i > 0 ? homeStyles.eyebrowItem : undefined}>
                {i > 0 && <span className="sr-only">, </span>}
                {word}
              </span>
            ))}
          </p>

          <h1
            id="capability-hero-title"
            className="mt-6 font-hb-display text-[clamp(2.5rem,1.7rem+2.5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg"
          >
            <span className="block">{detail.hero.headline}</span>
            <span className="block text-hb-blue">{detail.hero.headlineAccent}</span>
          </h1>

          <SiteLede className="mt-6">{detail.hero.summary}</SiteLede>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href="#what-we-do" variant="secondary" size="lg">
              See How It Works
            </SiteButton>
          </div>
        </div>

        <div className={`col-span-4 md:col-span-8 lg:col-span-6 ${styles.heroVisual}`}>
          <CapabilityFocusSystem
            idPrefix={`${detail.slug}-hero`}
            module={detail.systemModule}
            featuredLabel={name}
            label={detail.hero.visualLabel}
            className="mx-auto max-w-[520px] lg:mr-0 lg:max-w-[600px]"
          />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}
