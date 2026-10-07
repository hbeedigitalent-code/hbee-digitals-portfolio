import type { ReactNode } from 'react'
import { BarChart3, Repeat2, Search, ShieldCheck, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/cn'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { DiagnosticSystem } from './DiagnosticSystem'
import { GrowthReviewForm } from './GrowthReviewForm'
import { GR_AREAS, GR_ASSESSMENT, GR_HERO, GR_LOOK_AT, GR_NEXT, type AreaKey } from './growth-review-content'
import homeStyles from '../home/home.module.css'
import styles from './growth-review.module.css'

export const ASSESSMENT_ID = 'growth-review-assessment'

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%', 'aria-hidden': true, focusable: false } as const
const AREA_ICONS: Record<AreaKey, ReactNode> = {
  visibility: <Search {...ICON} />,
  conversion: <ShoppingCart {...ICON} />,
  retention: <Repeat2 {...ICON} />,
  authority: <ShieldCheck {...ICON} />,
  scalability: <BarChart3 {...ICON} />,
}

/* ── 01 — Introduction (Cloud). Text is server-rendered and visible immediately. ── */

export function GrowthReviewHero() {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="gr-hero-title" className="overflow-hidden">
      <div aria-hidden="true" className={homeStyles.heroField}>
        <svg className={homeStyles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>
      <SiteGrid className={`items-center gap-y-12 pb-[var(--hb-space-section-compact)] pt-[clamp(2.5rem,5vw,4.5rem)] lg:pt-12 ${styles.heroLayout}`}>
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            {GR_HERO.eyebrow}
          </p>
          <h1 id="gr-hero-title" className="mt-6 font-hb-display text-[clamp(2.5rem,1.7rem+2.5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg">
            {GR_HERO.headline} <span className="text-hb-blue">{GR_HERO.headlineAccent}</span>
          </h1>
          <SiteLede className="mt-6 max-w-[34rem]">{GR_HERO.lede}</SiteLede>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href={`#${ASSESSMENT_ID}`} variant="conversion" size="lg" arrow>
              {GR_HERO.cta}
            </SiteButton>
          </div>
          <ul className={styles.trust}>
            {GR_HERO.trust.map((t) => (
              <li key={t} className={styles.trustItem}>
                <span aria-hidden="true" className={styles.trustNode} />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className={`col-span-4 pt-3 md:col-span-8 lg:col-span-6 lg:pt-0 ${styles.heroVisual}`}>
          <DiagnosticSystem className="mx-auto max-w-[480px] lg:mr-0 lg:max-w-[600px]" />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 02 + 03 — What we look at · What happens after you submit (White) ── */

export function GrowthReviewContext() {
  return (
    <SiteSection tone="white" spacing="compact" aria-label="About the Growth Review">
      <SiteGrid className="gap-y-14">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <SiteReveal>
            <SiteDisplayHeading as="h2" size="h3" className={styles.contextTitle}>
              {GR_LOOK_AT.title}
            </SiteDisplayHeading>
            <p className={styles.contextLine}>{GR_LOOK_AT.line}</p>
          </SiteReveal>
          <SiteReveal motion="none" className={styles.areas}>
            <span aria-hidden="true" className={styles.areasRail} />
            <ul className={styles.areaList}>
              {GR_AREAS.map((a, i) => (
                <li key={a.key} data-motion="reveal" className={styles.area} style={{ ['--hb-motion-index' as string]: i }}>
                  <span aria-hidden="true" className={styles.areaIcon}>
                    {AREA_ICONS[a.key]}
                  </span>
                  <span className={styles.areaBody}>
                    <span className={styles.areaName}>{a.name}</span>
                    <span className={styles.areaText}>{a.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </SiteReveal>
        </div>

        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-6 min-[1152px]:col-start-7">
          <SiteReveal>
            <SiteDisplayHeading as="h2" size="h3" className={styles.contextTitle}>
              {GR_NEXT.title}
            </SiteDisplayHeading>
          </SiteReveal>
          <ol className={styles.steps}>
            {GR_NEXT.steps.map((step, i) => (
              <SiteReveal as="li" key={step.title} index={i} className={styles.step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={styles.stepBody}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              </SiteReveal>
            ))}
          </ol>
          <SiteReveal index={2}>
            <p className={styles.closing}>{GR_NEXT.closing}</p>
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 04 — The assessment (Cloud): the quiet, focused part of the page ── */

export function GrowthReviewAssessment() {
  return (
    <SiteSection id={ASSESSMENT_ID} tone="cloud" spacing="none" aria-labelledby="gr-assessment-title" className={cn(styles.anchor, styles.assessmentSection)}>
      <div className={styles.assessment}>
        <div className={styles.assessmentHead}>
          <SiteEyebrow signal>{GR_ASSESSMENT.eyebrow}</SiteEyebrow>
          <SiteDisplayHeading id="gr-assessment-title" size="h2" className={styles.assessmentTitle}>
            {GR_ASSESSMENT.title}
          </SiteDisplayHeading>
          <p className={styles.privacy}>
            {GR_ASSESSMENT.privacy}{' '}
            <a href="/privacy" className={styles.inlineLink}>
              Read our Privacy Policy
            </a>
            .
          </p>
        </div>
        <GrowthReviewForm />
      </div>
    </SiteSection>
  )
}
