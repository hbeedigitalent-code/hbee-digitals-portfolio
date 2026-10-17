import { HbeeModuleGroup } from '../module/HbeeModuleGroup'
import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteLede } from '../primitives/SiteTypography'
import { ALL_WORK_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { HERO } from './home-content'
import styles from './home.module.css'

/**
 * 02 — Hero. Text is server-rendered and visible immediately (no entrance
 * gating — it is the LCP). Only the module system reveals and assembles.
 *
 * Desktop ≥1280: 5 / 7 columns. 1024–1279: 6 / 6 so the headline never
 * overflows its column. Mobile: headline → copy → CTAs → system.
 */
export function HomeHero() {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="home-hero-title" className="overflow-hidden">
      <div aria-hidden="true" className={styles.heroField}>
        <svg className={styles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>

      {/* Desktop: the text column aligns to the TOP of the row (it used to be
          centred against the much taller module column, which pushed the CTAs
          below the fold on ~768px-tall laptops). Its offset scales with
          viewport height, so short screens stay tight and tall screens breathe. */}
      <SiteGrid className={`items-center gap-y-12 pb-[var(--hb-space-section-compact)] pt-[clamp(2.5rem,5vw,4.5rem)] lg:pt-10 ${styles.heroLayout}`}>
        <div className={`col-span-4 md:col-span-8 lg:col-span-6 lg:mt-[clamp(1.5rem,5vh,4rem)] lg:self-start xl:col-span-5 ${styles.heroText}`}>
          {/* One typographic sequence in two deliberate lines of three (six words no
              longer fit the column). Separators sit only BETWEEN words within a
              line, so no line ever starts with one; the second line hangs under
              the first word. Screen readers hear a comma-separated list. */}
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.eyebrowSignal} />
            {[HERO.eyebrow.slice(0, 3), HERO.eyebrow.slice(3)].map((line, l) => (
              <span key={l} className={l > 0 ? `${styles.eyebrowLine} ${styles.eyebrowLineHang}` : styles.eyebrowLine}>
                {line.map((word, i) => (
                  <span key={word} className={i > 0 ? styles.eyebrowItem : undefined}>
                    {(l > 0 || i > 0) && <span className="sr-only">, </span>}
                    {word}
                  </span>
                ))}
              </span>
            ))}
          </p>

          <h1
            id="home-hero-title"
            className="mt-6 font-hb-display text-[clamp(2.5rem,4.1vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg"
          >
            <span className="lg:block">{HERO.headline[0]} </span>
            <span className="lg:block">{HERO.headline[1]} </span>
            <span className="lg:block">
              <span className={styles.connects}>{HERO.headline[2].replace(/\.$/, '')}</span>
              <span className={styles.stop}>.</span>
            </span>
          </h1>

          <SiteLede className="mt-6">{HERO.lede}</SiteLede>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href={ALL_WORK_HREF} variant="secondary" size="lg">
              Explore Our Work
            </SiteButton>
          </div>
        </div>

        <div className={`col-span-4 md:col-span-8 lg:col-span-6 xl:col-span-7 ${styles.heroVisual}`}>
          <HbeeModuleGroup
            idPrefix="hero"
            motion="hero"
            spine="brand"
            composition="homeHero"
            label="The Hbee system: Brand, Experience, Technology, Creative, Discovery and Growth, connected."
            className="mx-auto max-w-[680px]"
          />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}
