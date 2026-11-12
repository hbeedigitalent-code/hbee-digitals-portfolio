import Link from 'next/link'
import type { ReactNode } from 'react'
import { Compass, Eye, Layers, Link2, Route, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ALL_WORK_HREF, CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteImage } from '../primitives/SiteImage'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER } from '../services/capability-entities'
import { PROCESS_STAGES } from '../how-we-work/how-we-work-content'
import {
  ABOUT_CTA,
  ABOUT_HERO,
  ABOUT_QUESTIONS,
  ABOUT_QUESTIONS_INTRO,
  METHOD,
  PRINCIPLES,
  PRINCIPLES_INTRO,
  TOGETHER,
  WHY_EXISTS,
  WORK_PROOF,
  WORK_WITH,
  WORK_WITH_INTRO,
  type PrincipleIcon,
} from './about-content'
import { AboutPeopleSystem, type HeroPhoto } from './AboutVisuals'
import homeStyles from '../home/home.module.css'
import capabilityStyles from '../capability/capability.module.css'
import styles from './about.module.css'

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%', 'aria-hidden': true, focusable: false } as const

/** flow: one balanced heading instead of two forced lines (for long headlines in narrow columns). */
function Intro({ eyebrow, id, headline, accent, flow }: { eyebrow: string; id: string; headline: readonly string[]; accent?: boolean; flow?: boolean }) {
  return (
    <>
      <SiteReveal>
        <SiteEyebrow signal>{eyebrow}</SiteEyebrow>
      </SiteReveal>
      <SiteReveal index={1}>
        <SiteDisplayHeading id={id} size="h2" className="mt-6">
          {headline[0]} <span className={cn(!flow && 'block', accent && 'text-hb-blue')}>{headline[1]}</span>
        </SiteDisplayHeading>
      </SiteReveal>
    </>
  )
}

/* ── 01 — Hero (Cloud). Text is server-rendered and visible immediately. ── */

export function AboutHero({ photos }: { photos: HeroPhoto[] }) {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="about-hero-title" className="overflow-hidden">
      <div aria-hidden="true" className={homeStyles.heroField}>
        <svg className={homeStyles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>
      <SiteGrid className={`items-center gap-y-12 pb-[var(--hb-space-section-compact)] pt-[clamp(2.5rem,5vw,4.5rem)] lg:pt-12 ${styles.heroLayout}`}>
        <div className="col-span-4 md:col-span-8 lg:col-span-6 min-[1152px]:col-span-5">
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            {ABOUT_HERO.eyebrow}
          </p>
          <h1 id="about-hero-title" className="mt-6 font-hb-display text-[clamp(2.1rem,1.5rem+2vw,3.2rem)] font-bold leading-[1.05] tracking-[-0.04em] text-hb-fg">
            <span className="block">{ABOUT_HERO.headline}</span>
            <span className="block text-hb-blue">{ABOUT_HERO.headlineAccent}</span>
          </h1>
          <SiteLede className="mt-6 max-w-[34rem]">{ABOUT_HERO.lede}</SiteLede>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
              Talk to Our Team
            </SiteButton>
          </div>
        </div>
        <div className={`col-span-4 md:col-span-8 lg:col-span-6 min-[1152px]:col-span-7 ${styles.heroVisual}`}>
          <AboutPeopleSystem photos={photos} className="mx-auto max-w-[540px] lg:mr-0 lg:max-w-[640px] min-[1152px]:max-w-[min(680px,calc(100%_-_3rem))]" />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 02 — Why Hbee exists: the problem and the point of view (no counters, no claims) ── */

export function WhyHbeeExists({ image }: { image?: string }) {
  return (
    <SiteSection tone="white" aria-labelledby="about-why-title">
      <SiteGrid className="items-center gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-6">
          <Intro eyebrow={WHY_EXISTS.eyebrow} id="about-why-title" headline={WHY_EXISTS.headline} />
          <SiteReveal index={2}>
            {WHY_EXISTS.copy.map((p) => (
              <p key={p} className="mt-6 max-w-[36rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">
                {p}
              </p>
            ))}
          </SiteReveal>
        </div>
        <SiteReveal motion="focus" index={1} className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-6">
          <div className={cn(styles.purpose, image && styles.purposeWithImage)}>
            {image ? (
              <div className={styles.purposeMedia}>
                <SiteImage src={image} alt="" sizes="(min-width: 1152px) 40vw, 100vw" className={styles.purposeImg} />
              </div>
            ) : (
              <div aria-hidden="true" className={styles.purposePlane}>
                <HbeeModuleGlyph signal="none" className={styles.purposeGlyph} />
              </div>
            )}
            <div className={styles.purposeCard}>
              <p className={styles.purposeLabel}>
                <span aria-hidden="true" className={styles.purposeLabelSignal} />
                {WHY_EXISTS.point.label}
              </p>
              <p className={styles.purposeTitle}>
                {WHY_EXISTS.point.headline.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </p>
              <p className={styles.purposeText}>{WHY_EXISTS.point.text}</p>
            </div>
          </div>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 03 — What we bring together: the six final capabilities, each linked (compact) ── */

export function BringTogether() {
  return (
    <SiteSection tone="cloud" aria-labelledby="about-together-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <Intro eyebrow={TOGETHER.eyebrow} id="about-together-title" headline={TOGETHER.headline} />
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[32rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{TOGETHER.copy}</p>
            <SiteLinkArrow href="/services" className="mt-4 min-h-[44px]">
              {TOGETHER.link}
            </SiteLinkArrow>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7">
          <ul className={styles.caps}>
            {CAPABILITY_ORDER.map((slug, i) => {
              const entity = CAPABILITY_ENTITIES[slug]
              return (
                <SiteReveal as="li" key={slug} index={i % 2}>
                  <Link href={entity.href} className={styles.cap} aria-label={entity.linkLabel}>
                    <span className={styles.capName}>{entity.name}</span>
                    <span className={styles.capText}>{entity.coreWork.slice(0, 2).join(' · ')}</span>
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

/* ── 04 — How we work: a short bridge to the five stages (not the whole process) ── */

export function MethodBridge() {
  return (
    <SiteSection id="approach" tone="white" aria-labelledby="about-method-title" className={styles.anchor}>
      <SiteGrid className="items-center gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <Intro eyebrow={METHOD.eyebrow} id="about-method-title" headline={METHOD.headline} />
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[32rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{METHOD.copy}</p>
            <SiteLinkArrow href="/how-we-work" className="mt-4 min-h-[44px]">
              {METHOD.link}
            </SiteLinkArrow>
          </SiteReveal>
        </div>
        <SiteReveal index={1} className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7">
          <ol className={styles.stages} aria-label="The five stages Hbee works through">
            {PROCESS_STAGES.map((stage, i) => (
              <li key={stage.id} className={styles.stage}>
                <span aria-hidden="true" className={styles.stageNode}>
                  {i + 1}
                </span>
                <Link href={`/how-we-work#${stage.id}`} className={styles.stageName}>
                  {stage.name}
                </Link>
              </li>
            ))}
          </ol>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 06 — Operating principles (working rules, not generic values) ── */

const PRINCIPLE_ICONS: Record<PrincipleIcon, ReactNode> = {
  diagnosis: <Compass {...ICON} />,
  connected: <Link2 {...ICON} />,
  priorities: <Route {...ICON} />,
  execution: <Layers {...ICON} />,
  measurement: <TrendingUp {...ICON} />,
  honesty: <Eye {...ICON} />,
}

export function Principles() {
  return (
    <SiteSection tone="cloud" aria-labelledby="about-principles-title">
      <SiteGrid className="gap-y-6">
        <div className="col-span-4 md:col-span-8 lg:col-span-5">
          <Intro eyebrow={PRINCIPLES_INTRO.eyebrow} id="about-principles-title" headline={PRINCIPLES_INTRO.headline} />
        </div>
        <SiteReveal index={2} className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7 lg:self-end">
          <p className="max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{PRINCIPLES_INTRO.copy}</p>
        </SiteReveal>
      </SiteGrid>
      <ol className={cn(styles.beliefs, styles.principles)}>
        {PRINCIPLES.map((p, i) => (
          <SiteReveal as="li" key={p.key} index={i % 3} className={styles.belief}>
            <span aria-hidden="true" className={styles.beliefIcon}>
              {PRINCIPLE_ICONS[p.key]}
            </span>
            <div>
              <h3 className={styles.beliefName}>{p.name}</h3>
              <p className={styles.beliefText}>{p.text}</p>
            </div>
          </SiteReveal>
        ))}
      </ol>
    </SiteSection>
  )
}

/* ── 07 — Our work: a bridge to the CMS-backed Work page (no invented proof) ── */

export function AboutWork() {
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="about-work-title">
      <SiteGrid className="items-center gap-y-8">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-6">
          <Intro eyebrow={WORK_PROOF.eyebrow} id="about-work-title" headline={WORK_PROOF.headline} />
        </div>
        <SiteReveal index={2} className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-6">
          <p className="max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{WORK_PROOF.copy}</p>
          <SiteLinkArrow href={ALL_WORK_HREF} className="mt-4 min-h-[44px]">
            {WORK_PROOF.link}
          </SiteLinkArrow>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 08 — Who we work with: help visitors self-identify ── */

export function WhoWeWorkWith() {
  return (
    <SiteSection tone="cloud" aria-labelledby="about-fit-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <Intro eyebrow={WORK_WITH_INTRO.eyebrow} id="about-fit-title" headline={WORK_WITH_INTRO.headline} flow />
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[32rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{WORK_WITH_INTRO.copy}</p>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7">
          <ul className={styles.fit}>
            {WORK_WITH.map((w, i) => (
              <SiteReveal as="li" key={w.name} index={i} className={styles.fitItem}>
                <span aria-hidden="true" className={styles.fitIndex}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className={styles.fitName}>{w.name}</h3>
                  <p className={styles.fitText}>{w.text}</p>
                </div>
              </SiteReveal>
            ))}
          </ul>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 09 — Questions about Hbee Digitals (visible HTML; no FAQPage schema) ── */

export function AboutQuestions() {
  return (
    <SiteSection tone="white" aria-labelledby="about-questions-title">
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>{ABOUT_QUESTIONS_INTRO.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="about-questions-title" size="h2" className="mt-6">
              {ABOUT_QUESTIONS_INTRO.headline}
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <dl className={cn(styles.questions, 'col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8')}>
          {ABOUT_QUESTIONS.map((q, i) => (
            <SiteReveal key={q.question} index={i % 3} className={styles.question}>
              <dt>
                <h3 className={styles.questionTitle}>{q.question}</h3>
              </dt>
              <dd className={styles.questionAnswer}>{q.answer}</dd>
            </SiteReveal>
          ))}
        </dl>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 10 — Final CTA (Night). Primary: Growth Review · Secondary: Contact. ── */

export function AboutCta() {
  return (
    <SiteSection tone="night" aria-labelledby="about-cta-title" className="overflow-hidden">
      <div aria-hidden="true" className={capabilityStyles.ctaGeometry}>
        <HbeeModuleGlyph signal="none" className={capabilityStyles.ctaGlyph} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph2}`} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph3}`} />
      </div>
      <div className={cn('relative', styles.cta)}>
        <div>
          <SiteReveal>
            <SiteEyebrow signal>{ABOUT_CTA.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="about-cta-title" size="h2" className="mt-6">
              {ABOUT_CTA.headline[0]} <span className="block">{ABOUT_CTA.headline[1]}</span>
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <div>
          <SiteReveal index={2}>
            <p className="max-w-[34rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">{ABOUT_CTA.copy}</p>
          </SiteReveal>
          <SiteReveal index={3} className="mt-8 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
              Talk to Our Team
            </SiteButton>
          </SiteReveal>
        </div>
      </div>
    </SiteSection>
  )
}
