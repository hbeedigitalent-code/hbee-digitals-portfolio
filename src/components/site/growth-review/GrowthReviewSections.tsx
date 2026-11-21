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
import { GrowthReviewQuickForm } from './GrowthReviewQuickForm'
import { BFCM_CONTEXT_ACTIVE, GR_BFCM } from './bfcm-context'
import { GR_DEEPER, GR_FINAL, GR_HOW, GR_LOOK, GR_OFFER_HERO, GR_RECEIVE, QUICK_FORM_ID } from './growth-review-campaign-content'
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

/* ── 01 — Offer + short form (Cloud). Text is server-rendered and visible immediately. ── */

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
      <SiteGrid className={`items-start gap-y-8 pb-[var(--hb-space-section-compact)] pt-[clamp(2rem,4vw,3.5rem)] lg:items-center lg:pt-12 ${styles.heroLayout}`}>
        <div data-hero-copy="" className="col-span-4 md:col-span-8 lg:col-span-6">
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            {GR_OFFER_HERO.eyebrow}
          </p>
          <h1 id="gr-hero-title" className="mt-5 font-hb-display text-[clamp(2.25rem,1.6rem+2.2vw,3.3rem)] font-bold leading-[1.04] tracking-[-0.04em] text-hb-fg">
            <span className="block">{GR_OFFER_HERO.headline}</span>
            <span className="block text-hb-blue">{GR_OFFER_HERO.headlineAccent}</span>
          </h1>
          <SiteLede className="mt-5 max-w-[34rem]">{GR_OFFER_HERO.lede}</SiteLede>
          <ConstraintContext variant="hero" />
          <ul className={styles.trust}>
            <li className={styles.trustItem}>
              <span aria-hidden="true" className={styles.trustNode} />
              {GR_OFFER_HERO.trust}
            </li>
          </ul>
        </div>
        <div id={QUICK_FORM_ID} className={`col-span-4 md:col-span-8 lg:col-span-6 ${styles.anchor} ${styles.heroVisual}`}>
          <GrowthReviewQuickForm location="hero" />
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
          <SiteReveal motion="none">
            <SiteEyebrow motionIndex={0} signal>Who it is for</SiteEyebrow>
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
              <SiteReveal as="li" key={text} motion="card" index={i % 4} className={styles.symptom}>
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
          <SiteReveal motion="none">
            <SiteEyebrow motionIndex={0} signal>Areas Hbee can investigate</SiteEyebrow>
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
                <SiteReveal as="li" key={slug} motion="item" index={i % 3}>
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
              <SiteReveal as="li" key={step.title} motion="item" index={i} className={styles.step}>
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
          <SiteReveal motion="none">
            <SiteEyebrow motionIndex={0} signal>Questions</SiteEyebrow>
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
              <SiteReveal key={q.question} motion="item" index={i % 3} className={styles.question}>
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

/* ── Offer sections (Free Growth Review) ── */

export function GrowthReviewReceive() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="gr-receive-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <SiteReveal motion="none">
            <SiteEyebrow motionIndex={0} signal>{GR_RECEIVE.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="gr-receive-title" as="h2" size="h3" className={cn(styles.contextTitle, 'mt-6')}>
              {GR_RECEIVE.title}
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8">
          <ol className={cn(styles.steps, styles.stepsFirst)}>
            {GR_RECEIVE.items.map((item, i) => (
              <SiteReveal as="li" key={item.title} motion="item" index={i} className={styles.step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={styles.stepBody}>
                  <h3 className={styles.stepTitle}>{item.title}</h3>
                  <p className={styles.stepText}>{item.text}</p>
                </div>
              </SiteReveal>
            ))}
          </ol>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

export function GrowthReviewLook() {
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="gr-look-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <SiteReveal motion="none">
            <SiteEyebrow motionIndex={0} signal>{GR_LOOK.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="gr-look-title" as="h2" size="h3" className={cn(styles.contextTitle, 'mt-6')}>
              {GR_LOOK.title}
            </SiteDisplayHeading>
            <p className={styles.contextLine}>{GR_LOOK.copy}</p>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7">
          <ul className={styles.capCards}>
            {GR_LOOK.items.map((name, i) => (
              <SiteReveal as="li" key={name} motion="item" index={i % 3} className={cn(styles.capCard, styles.lookCard)}>
                <span aria-hidden="true" className={styles.lookNumber}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className={styles.capCardName}>{name}</span>
              </SiteReveal>
            ))}
          </ul>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

export function GrowthReviewHow() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="gr-how-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <SiteReveal motion="none">
            <SiteEyebrow motionIndex={0} signal>{GR_HOW.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="gr-how-title" as="h2" size="h3" className={cn(styles.contextTitle, 'mt-6')}>
              {GR_HOW.title}
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8">
          <ol className={cn(styles.steps, styles.stepsFirst)}>
            {GR_HOW.steps.map((step, i) => (
              <SiteReveal as="li" key={step.title} motion="item" index={i} className={styles.step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {i + 1}
                </span>
                <div className={styles.stepBody}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              </SiteReveal>
            ))}
          </ol>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/** Seasonal. Retire via BFCM_CONTEXT_ACTIVE in bfcm-context.ts; the rest of the page does not depend on it. */
export function GrowthReviewBfcm() {
  if (!BFCM_CONTEXT_ACTIVE) return null
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="gr-bfcm-title">
      <SiteReveal motion="soft" className={styles.bfcm}>
        <SiteEyebrow signal>{GR_BFCM.eyebrow}</SiteEyebrow>
        <SiteDisplayHeading id="gr-bfcm-title" as="h2" size="h3" className={cn(styles.contextTitle, 'mt-5')}>
          {GR_BFCM.title}
        </SiteDisplayHeading>
        <p className={styles.contextLine}>{GR_BFCM.copy}</p>
        <ul className={styles.bfcmList}>
          {GR_BFCM.points.map((p) => (
            <li key={p} className={styles.trustItem}>
              <span aria-hidden="true" className={styles.trustNode} />
              {p}
            </li>
          ))}
        </ul>
        <p className={styles.closing} style={{ marginLeft: 0 }}>
          {GR_BFCM.closing}
        </p>
      </SiteReveal>
    </SiteSection>
  )
}

export function GrowthReviewFinalCta() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="gr-final-title">
      <SiteReveal motion="soft" className={styles.finalCta}>
        <SiteDisplayHeading id="gr-final-title" as="h2" size="h3" className={styles.contextTitle}>
          {GR_FINAL.title}
        </SiteDisplayHeading>
        <p className={styles.contextLine}>{GR_FINAL.copy}</p>
        <div className="mt-7">
          <SiteButton href={`#${QUICK_FORM_ID}`} variant="conversion" size="lg" arrow>
            {GR_FINAL.cta}
          </SiteButton>
        </div>
      </SiteReveal>
    </SiteSection>
  )
}

/* ── The deeper Growth Profile assessment (Cloud): optional, below the free review ── */

export function GrowthReviewAssessment() {
  return (
    <SiteSection id={ASSESSMENT_ID} tone="cloud" spacing="none" aria-labelledby="gr-assessment-title" className={cn(styles.anchor, styles.assessmentSection)}>
      <SiteReveal motion="soft" className={styles.assessment}>
        <div className={styles.assessmentHead}>
          <SiteEyebrow signal>{GR_DEEPER.eyebrow}</SiteEyebrow>
          <SiteDisplayHeading id="gr-assessment-title" size="h2" className={styles.assessmentTitle}>
            {GR_DEEPER.title}
          </SiteDisplayHeading>
          <p className={styles.formNote}>{GR_DEEPER.copy}</p>
          <p className={styles.privacy}>
            {GR_DEEPER.privacy}{' '}
            <a href="/privacy" className={styles.inlineLink}>
              Read our Privacy Policy
            </a>
            .
          </p>
        </div>
        <GrowthReviewForm />
      </SiteReveal>
    </SiteSection>
  )
}
