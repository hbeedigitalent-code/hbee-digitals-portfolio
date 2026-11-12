import Link from 'next/link'
import { cn } from '@/lib/cn'
import { CONTACT_HREF } from '@/lib/site/routes'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { CAPABILITY_ICONS } from '../capability/capability-icons'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER, type CapabilitySlug } from '../services/capability-entities'
import { CapabilityDiagnosticSystem } from './CapabilityDiagnosticSystem'
import { ConstraintContext } from './ConstraintContext'
import { GrowthReviewForm } from './GrowthReviewForm'
import {
  GR_ASSESSMENT,
  GR_CAPABILITIES,
  GR_FOLLOW,
  GR_FORM_NOTE,
  GR_HERO,
  GR_NEXT,
  GR_QUESTIONS,
  GR_QUESTIONS_INTRO,
  GR_SYMPTOMS,
  GR_SYMPTOMS_INTRO,
} from './growth-review-content'
import homeStyles from '../home/home.module.css'
import styles from './growth-review.module.css'

export const ASSESSMENT_ID = 'growth-review-assessment'

const CAPABILITY_ICON: Record<CapabilitySlug, 'brand' | 'systems' | 'creative' | 'discovery' | 'commerce' | 'retention'> = {
  'brand-positioning': 'brand',
  'digital-systems': 'systems',
  'creative-ugc': 'creative',
  'discovery-traffic': 'discovery',
  'commerce-experience': 'commerce',
  'retention-growth': 'retention',
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
          <h1 id="gr-hero-title" className="mt-6 font-hb-display text-[clamp(2.25rem,1.6rem+2.2vw,3.3rem)] font-bold leading-[1.04] tracking-[-0.04em] text-hb-fg">
            <span className="block">{GR_HERO.headline}</span>
            <span className="block text-hb-blue">{GR_HERO.headlineAccent}</span>
          </h1>
          <SiteLede className="mt-6 max-w-[34rem]">{GR_HERO.lede}</SiteLede>
          <ConstraintContext variant="hero" />
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
          <CapabilityDiagnosticSystem className="mx-auto max-w-[480px] lg:mr-0 lg:max-w-[600px]" />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 02 — Who it is for: merchant symptoms (White) ── */

export function GrowthReviewSymptoms() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="gr-symptoms-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>Who it is for</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="gr-symptoms-title" as="h2" size="h3" className={cn(styles.contextTitle, 'mt-6')}>
              {GR_SYMPTOMS_INTRO.title}
            </SiteDisplayHeading>
            <p className={styles.contextLine}>{GR_SYMPTOMS_INTRO.copy}</p>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8">
          <ul className={styles.symptoms}>
            {GR_SYMPTOMS.map((text, i) => (
              <SiteReveal as="li" key={text} index={i % 4} className={styles.symptom}>
                <span aria-hidden="true" className={styles.symptomNode} />
                <span>{text}</span>
              </SiteReveal>
            ))}
          </ul>
          <SiteReveal index={2}>
            <p className={styles.closing} style={{ marginLeft: 0 }}>
              {GR_SYMPTOMS_INTRO.closing}
            </p>
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 03 — Where the diagnosis can lead: the six capabilities (Cloud). Not a scoring model. ── */

export function GrowthReviewCapabilities() {
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="gr-capabilities-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <SiteReveal>
            <SiteEyebrow signal>Areas Hbee can investigate</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="gr-capabilities-title" as="h2" size="h3" className={cn(styles.contextTitle, 'mt-6')}>
              {GR_CAPABILITIES.title}
            </SiteDisplayHeading>
            <p className={styles.contextLine}>{GR_CAPABILITIES.copy}</p>
            <p className={styles.contextLine}>{GR_CAPABILITIES.note}</p>
            <SiteLinkArrow href="/how-we-work" className="mt-4 min-h-[44px]">
              {GR_CAPABILITIES.how}
            </SiteLinkArrow>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7">
          <ul className={styles.capCards}>
            {CAPABILITY_ORDER.map((slug, i) => {
              const entity = CAPABILITY_ENTITIES[slug]
              return (
                <SiteReveal as="li" key={slug} index={i % 3}>
                  <Link href={entity.href} className={styles.capCard} aria-label={entity.linkLabel}>
                    <span aria-hidden="true" className={styles.capCardIcon}>
                      {CAPABILITY_ICONS[CAPABILITY_ICON[slug]]}
                    </span>
                    <span className={styles.capCardName}>{entity.name}</span>
                  </Link>
                </SiteReveal>
              )
            })}
          </ul>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 04 — What happens after you submit (White) ── */

export function GrowthReviewNext() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="gr-next-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <SiteReveal>
            <SiteDisplayHeading id="gr-next-title" as="h2" size="h3" className={styles.contextTitle}>
              {GR_NEXT.title}
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8">
          <ol className={cn(styles.steps, styles.stepsFirst)}>
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
            <p className={styles.profileNote}>{GR_NEXT.profile}</p>
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 05 — Questions merchants ask (White → visible HTML, no FAQPage schema) ── */

export function GrowthReviewQuestions() {
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="gr-questions-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>Questions</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="gr-questions-title" as="h2" size="h3" className={cn(styles.contextTitle, 'mt-6')}>
              {GR_QUESTIONS_INTRO.title}
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8">
          <dl className={styles.questions}>
            {GR_QUESTIONS.map((q, i) => (
              <SiteReveal key={q.question} index={i % 3} className={styles.question}>
                <dt>
                  <h3 className={styles.questionTitle}>{q.question}</h3>
                </dt>
                <dd className={styles.questionAnswer}>{q.answer}</dd>
              </SiteReveal>
            ))}
          </dl>
          <SiteReveal index={2} className={styles.follow}>
            <SiteLinkArrow href="/how-we-work" className="min-h-[44px]">
              {GR_FOLLOW.how}
            </SiteLinkArrow>
            <p className={styles.followContact}>
              {GR_FOLLOW.contactLead}{' '}
              <a href={CONTACT_HREF} className={styles.inlineLink}>
                {GR_FOLLOW.contact}
              </a>
              .
            </p>
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 06 — The assessment (Cloud): the quiet, focused part of the page ── */

export function GrowthReviewAssessment() {
  return (
    <SiteSection id={ASSESSMENT_ID} tone="cloud" spacing="none" aria-labelledby="gr-assessment-title" className={cn(styles.anchor, styles.assessmentSection)}>
      <div className={styles.assessment}>
        <div className={styles.assessmentHead}>
          <SiteEyebrow signal>{GR_ASSESSMENT.eyebrow}</SiteEyebrow>
          <SiteDisplayHeading id="gr-assessment-title" size="h2" className={styles.assessmentTitle}>
            {GR_ASSESSMENT.title}
          </SiteDisplayHeading>
          <p className={styles.formNote}>{GR_FORM_NOTE}</p>
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
