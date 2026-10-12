import type { ReactNode } from 'react'
import {
  BadgeCheck,
  Compass,
  Eye,
  Handshake,
  Layers,
  Lightbulb,
  Link2,
  Route,
  ShoppingBag,
  Sprout,
  TrendingUp,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteImage } from '../primitives/SiteImage'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import {
  ABOUT_CTA,
  ABOUT_HERO,
  BELIEFS,
  BELIEFS_INTRO,
  DIFFERENCES,
  DIFFERENCE_INTRO,
  REACH,
  THINKING,
  WHO_WE_ARE,
  WORK_WITH,
  WORK_WITH_INTRO,
  type BeliefIcon,
  type DifferenceIcon,
} from './about-content'
import { AboutPeopleSystem, ConnectedThinking, ReachField, type HeroPhoto } from './AboutVisuals'
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
          <h1 id="about-hero-title" className="mt-6 font-hb-display text-[clamp(2.5rem,1.7rem+2.5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg">
            {ABOUT_HERO.headline.map((line, i) => (
              <span key={line} className={i < 2 ? 'block' : undefined}>
                {line}
              </span>
            ))}{' '}
            <span className="text-hb-blue">{ABOUT_HERO.headlineAccent}</span>
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

/* ── 02 — Who we are: identity, not a services list. No counters (unverified). ── */

export function WhoWeAre({ image }: { image?: string }) {
  return (
    <SiteSection tone="white" aria-labelledby="about-who-title">
      <SiteGrid className="items-center gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-6">
          <Intro eyebrow={WHO_WE_ARE.eyebrow} id="about-who-title" headline={WHO_WE_ARE.headline} />
          <SiteReveal index={2}>
            {WHO_WE_ARE.copy.map((p) => (
              <p key={p} className="mt-6 max-w-[36rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">
                {p}
              </p>
            ))}
          </SiteReveal>
          <SiteReveal index={3} className="mt-10">
            <p className={styles.listLabel}>{WHO_WE_ARE.togetherLabel}</p>
            <ul className={styles.together}>
              {WHO_WE_ARE.together.map((item) => (
                <li key={item.name} className={styles.togetherItem}>
                  <span aria-hidden="true" className={styles.togetherNode} />
                  <span className={styles.togetherName}>{item.name}</span>
                  <span className={styles.togetherText}>{item.text}</span>
                </li>
              ))}
            </ul>
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
                {WHO_WE_ARE.purpose.label}
              </p>
              <p className={styles.purposeTitle}>
                {WHO_WE_ARE.purpose.headline.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </p>
              <p className={styles.purposeText}>{WHO_WE_ARE.purpose.text}</p>
            </div>
          </div>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 03 — What we believe: editorial statements, revealed progressively ── */

const BELIEF_ICONS: Record<BeliefIcon, ReactNode> = {
  people: <Users {...ICON} />,
  practical: <Lightbulb {...ICON} />,
  value: <Sprout {...ICON} />,
  openness: <Eye {...ICON} />,
  standard: <BadgeCheck {...ICON} />,
}

export function Beliefs() {
  return (
    <SiteSection tone="cloud" aria-labelledby="about-beliefs-title">
      <SiteGrid className="gap-y-6">
        <div className="col-span-4 md:col-span-8 lg:col-span-5">
          <Intro eyebrow={BELIEFS_INTRO.eyebrow} id="about-beliefs-title" headline={BELIEFS_INTRO.headline} />
        </div>
        <SiteReveal index={2} className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7 lg:self-end">
          <p className="max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{BELIEFS_INTRO.copy}</p>
        </SiteReveal>
      </SiteGrid>
      <ol className={styles.beliefs}>
        {BELIEFS.map((b, i) => (
          <SiteReveal as="li" key={b.key} index={i} className={styles.belief}>
            <span aria-hidden="true" className={styles.beliefIcon}>
              {BELIEF_ICONS[b.key]}
            </span>
            <div>
              <h3 className={styles.beliefName}>{b.name}</h3>
              <p className={styles.beliefText}>{b.text}</p>
            </div>
          </SiteReveal>
        ))}
      </ol>
    </SiteSection>
  )
}

/* ── 05 — How we think: a philosophy (not the five-stage process) ── */

export function HowWeThink() {
  return (
    <SiteSection id="approach" tone="cloud" aria-labelledby="about-think-title" className={cn(styles.anchor, styles.thinkSection)}>
      <SiteGrid className="items-center gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <Intro eyebrow={THINKING.eyebrow} id="about-think-title" headline={THINKING.headline} flow />
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{THINKING.copy}</p>
            <SiteLinkArrow href="/how-we-work" className="mt-4 min-h-[44px]">
              {THINKING.link}
            </SiteLinkArrow>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-6 ">
          <ConnectedThinking className="mx-auto max-w-[500px]" />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 06 — What makes us different: grounded, benefit-led (no superlatives) ── */

const DIFFERENCE_ICONS: Record<DifferenceIcon, ReactNode> = {
  clarity: <Compass {...ICON} />,
  connected: <Link2 {...ICON} />,
  commerce: <ShoppingBag {...ICON} />,
  commercial: <TrendingUp {...ICON} />,
  endToEnd: <Route {...ICON} />,
  partnership: <Handshake {...ICON} />,
}

export function Difference() {
  return (
    <SiteSection tone="white" aria-labelledby="about-difference-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <Intro eyebrow={DIFFERENCE_INTRO.eyebrow} id="about-difference-title" headline={DIFFERENCE_INTRO.headline} accent />
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[30rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{DIFFERENCE_INTRO.copy}</p>
          </SiteReveal>
          <SiteReveal index={3} className={styles.contrast}>
            <span aria-hidden="true" className={styles.contrastIcon}>
              <Layers {...ICON} />
            </span>
            <p>
              <span className="font-semibold text-hb-fg">One connected team</span> instead of separate suppliers to coordinate.
            </p>
          </SiteReveal>
        </div>
        <ul className={cn(styles.differences, 'col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8')}>
          {DIFFERENCES.map((d, i) => (
            <SiteReveal as="li" key={d.key} index={i % 2} className={styles.difference}>
              <span aria-hidden="true" className={styles.differenceIcon}>
                {DIFFERENCE_ICONS[d.key]}
              </span>
              <div>
                <h3 className={styles.differenceName}>{d.name}</h3>
                <p className={styles.differenceText}>{d.text}</p>
              </div>
            </SiteReveal>
          ))}
        </ul>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 07 — Our home and our reach: West Africa (identity) · Abuja (base) · everywhere (reach) ── */

export function Reach() {
  return (
    <SiteSection tone="cloud" aria-labelledby="about-reach-title">
      <SiteGrid className="gap-y-8">
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <Intro eyebrow={REACH.eyebrow} id="about-reach-title" headline={REACH.headline} />
        </div>
        <SiteReveal index={2} className="col-span-4 md:col-span-8 lg:col-span-6 lg:self-end">
          <p className="max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{REACH.copy}</p>
          <dl className={styles.reachPoints}>
            {REACH.points.map((p) => (
              <div key={p.name} className={styles.reachPoint}>
                <dt>{p.name}</dt>
                <dd>{p.text}</dd>
              </div>
            ))}
          </dl>
        </SiteReveal>
      </SiteGrid>
      <ReachField className="mt-12 md:mt-14" />
    </SiteSection>
  )
}

/* ── 08 — Who we work with: help visitors self-identify ── */

export function WhoWeWorkWith() {
  return (
    <SiteSection tone="white" aria-labelledby="about-fit-title">
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
          <SiteReveal index={2} className={styles.fitNote}>
            <p>{WORK_WITH_INTRO.fit}</p>
            <SiteLinkArrow href={GROWTH_REVIEW_HREF} className="min-h-[44px]">
              Start Growth Review
            </SiteLinkArrow>
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 09 — Final CTA (Night) ── */

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
