import { cn } from '@/lib/cn'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import homeStyles from '../home/home.module.css'
import growthStyles from '../growth-review/growth-review.module.css'
import { CHECKLIST_FORM_ID, CL_FINAL, CL_HERO, CL_LIST } from './checklist-content'
import { ChecklistGrowthReviewLink } from './ChecklistGrowthReviewLink'
import { ChecklistInteractive } from './ChecklistInteractive'
import { ChecklistRequestForm } from './ChecklistRequestForm'
import { ChecklistViewTracker } from './ChecklistViewTracker'
import styles from './bfcm-checklist.module.css'

/* ── 01 — Offer + request form (Cloud). Text is server-rendered and visible immediately. ── */

export function ChecklistHero() {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="cl-hero-title" className={cn('overflow-hidden', styles.heroFill)}>
      <ChecklistViewTracker />
      <div aria-hidden="true" className={homeStyles.heroField}>
        <svg className={homeStyles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>
      <SiteGrid className="items-start gap-y-8 pb-[var(--hb-space-section-compact)] pt-[clamp(2rem,4vw,3.5rem)] lg:items-center lg:pt-12">
        <div data-hero-copy="" className="col-span-4 md:col-span-8 lg:col-span-6">
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            {CL_HERO.eyebrow}
          </p>
          <h1 id="cl-hero-title" className="mt-5 font-hb-display text-[clamp(2.25rem,1.6rem+2.2vw,3.3rem)] font-bold leading-[1.04] tracking-[-0.04em] text-hb-fg">
            <span className="block">{CL_HERO.headline}</span>
            <span className="block text-hb-blue">{CL_HERO.headlineAccent}</span>
          </h1>
          <SiteLede className="mt-5 max-w-[34rem]">{CL_HERO.lede}</SiteLede>
          <div className={styles.heroActions}>
            <SiteButton href={`#${CHECKLIST_FORM_ID}`} variant="conversion" size="lg" arrow>
              {CL_HERO.cta}
            </SiteButton>
            <ChecklistGrowthReviewLink location="hero" variant="secondary" size="lg">
              {CL_HERO.secondaryCta}
            </ChecklistGrowthReviewLink>
          </div>
          <ul className={growthStyles.trust}>
            <li className={growthStyles.trustItem}>
              <span aria-hidden="true" className={growthStyles.trustNode} />
              {CL_HERO.trust}
            </li>
          </ul>
        </div>
        <div id={CHECKLIST_FORM_ID} className={cn('col-span-4 md:col-span-8 lg:col-span-6', styles.anchor)}>
          <ChecklistRequestForm />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 02 — The interactive checklist (White) ── */

export function ChecklistList() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="cl-list-title">
      <div className={styles.listWrap}>
        <SiteReveal motion="none">
          <SiteEyebrow signal>{CL_LIST.eyebrow}</SiteEyebrow>
        </SiteReveal>
        <SiteReveal index={1}>
          <SiteDisplayHeading id="cl-list-title" as="h2" size="h3" className={cn(growthStyles.contextTitle, 'mt-6')}>
            {CL_LIST.title}
          </SiteDisplayHeading>
          <p className={growthStyles.contextLine}>{CL_LIST.copy}</p>
        </SiteReveal>
      </div>
      <div className="mt-8">
        <ChecklistInteractive />
      </div>
      <div className={styles.listCta}>
        <SiteButton href={`#${CHECKLIST_FORM_ID}`} variant="secondary" size="md">
          Get the printable checklist
        </SiteButton>
        <span className={styles.listCtaText}>A PDF copy, sent to your email.</span>
      </div>
    </SiteSection>
  )
}

/* ── 03 — Growth Review hand-off (Cloud) ── */

export function ChecklistFinalCta() {
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="cl-final-title">
      <SiteReveal motion="soft" className={styles.finalCta}>
        <SiteDisplayHeading id="cl-final-title" as="h2" size="h3" className={growthStyles.contextTitle}>
          {CL_FINAL.title}
        </SiteDisplayHeading>
        <p className={growthStyles.contextLine}>{CL_FINAL.copy}</p>
        <div className="mt-7">
          <ChecklistGrowthReviewLink location="final_cta">{CL_FINAL.cta}</ChecklistGrowthReviewLink>
        </div>
      </SiteReveal>
    </SiteSection>
  )
}
