import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { BarChart3, Compass, Layers, MousePointerClick, Search, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { UTILITY_NAV } from '../navigation'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { SERVICE_GROUPS } from '../services/services-content'
import { CAPABILITY_ICONS } from '../capability/capability-icons'
import {
  CAPABILITIES_INTRO,
  CONDITIONS_INTRO,
  GROWTH_CONDITIONS,
  HOW_CTA,
  HOW_HERO,
  PORTAL_BENEFITS,
  PORTAL_INTRO,
  PORTAL_NAV,
  PROCESS_INTRO,
  PROCESS_STAGES,
  WORKING_INTRO,
  WORKING_PRINCIPLES,
  type ConditionIcon,
} from './how-we-work-content'
import { ProcessSystem } from './ProcessSystem'
import homeStyles from '../home/home.module.css'
import capabilityStyles from '../capability/capability.module.css'
import styles from './how-we-work.module.css'

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%', 'aria-hidden': true, focusable: false } as const
const CONDITION_ICONS: Record<ConditionIcon, ReactNode> = {
  clarity: <Compass {...ICON} />,
  confidence: <ShieldCheck {...ICON} />,
  discovery: <Search {...ICON} />,
  decision: <MousePointerClick {...ICON} />,
  value: <BarChart3 {...ICON} />,
  capacity: <Layers {...ICON} />,
}

/* ── 01 — Hero (Cloud). Text visible immediately; the process system plays once. ── */

export function HowWeWorkHero() {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="how-hero-title" className="overflow-hidden">
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
            How we work
          </p>
          <h1 id="how-hero-title" className="mt-6 font-hb-display text-[clamp(2.5rem,1.7rem+2.5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg">
            <span className="block">{HOW_HERO.headline}</span>
            <span className="block text-hb-blue">{HOW_HERO.headlineAccent}</span>
          </h1>
          <SiteLede className="mt-6">{HOW_HERO.lede}</SiteLede>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href="#the-process" variant="secondary" size="lg">
              See the Process
            </SiteButton>
          </div>
        </div>
        <div className={`col-span-4 md:col-span-8 lg:col-span-6 ${styles.heroVisual}`}>
          <ProcessSystem className="mx-auto max-w-[520px] lg:mr-0 lg:max-w-[580px]" />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 02 — Why diagnosis comes first: six DIAGNOSTIC conditions (not services) ── */

export function GrowthConditions() {
  return (
    <SiteSection tone="white" aria-labelledby="how-conditions-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5 min-[1152px]:self-center">
          <SiteReveal>
            <SiteEyebrow signal>The bigger picture</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="how-conditions-title" size="h2" className="mt-6 max-w-[32rem]">
              {CONDITIONS_INTRO.headline[0]} <span className="block">{CONDITIONS_INTRO.headline[1]}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{CONDITIONS_INTRO.copy}</p>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7 min-[1152px]:self-center">
          <p className={styles.conditionsLabel}>Six growth conditions we assess</p>
          <ul className={styles.conditions}>
            {GROWTH_CONDITIONS.map((c, i) => (
              <SiteReveal as="li" key={c.key} index={i % 3} className={styles.condition}>
                <span aria-hidden="true" className={styles.conditionIcon}>
                  {CONDITION_ICONS[c.key]}
                </span>
                <div>
                  <h3 className="font-hb-display text-[1.0625rem] font-semibold leading-snug text-hb-fg">{c.name}</h3>
                  <p className="mt-1 text-[0.9375rem] leading-snug text-hb-fg-body">{c.text}</p>
                </div>
              </SiteReveal>
            ))}
          </ul>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 03 — The five-stage Growth System (Night): one connected flow ── */

export function GrowthProcess() {
  return (
    <SiteSection id="the-process" tone="night" aria-labelledby="how-process-title" className={styles.anchor}>
      <SiteReveal>
        <SiteEyebrow signal>Our five-stage growth system</SiteEyebrow>
      </SiteReveal>
      <SiteReveal index={1}>
        <SiteDisplayHeading id="how-process-title" size="h2" className="mt-6">
          {PROCESS_INTRO.headline}
        </SiteDisplayHeading>
      </SiteReveal>
      <SiteReveal index={2}>
        <p className="mt-5 max-w-[40rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{PROCESS_INTRO.copy}</p>
      </SiteReveal>

      <SiteReveal motion="none" className={cn(styles.flow, 'mt-14')}>
        <span aria-hidden="true" className={styles.flowLine} />
        <span aria-hidden="true" className={styles.flowSignal} />
        <ol className={styles.flowList}>
          {PROCESS_STAGES.map((stage, i) => (
            <SiteReveal as="li" key={stage.name} index={i} className={styles.flowStage}>
              <span aria-hidden="true" className={styles.flowNode} data-first={i === 0 ? '' : undefined}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-hb-display text-[clamp(1.25rem,1.1rem+0.4vw,1.5rem)] font-bold leading-tight tracking-[-0.02em] text-hb-fg">
                  <span className="sr-only">Stage {i + 1}: </span>
                  {stage.name}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{stage.text}</p>
              </div>
            </SiteReveal>
          ))}
        </ol>
      </SiteReveal>
    </SiteSection>
  )
}

/* ── 04 — Capabilities enter where needed: WHAT may enter the process (not a package) ── */

export function ProcessCapabilities() {
  return (
    <SiteSection tone="cloud" aria-labelledby="how-capabilities-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5 min-[1152px]:self-center">
          <SiteReveal>
            <SiteEyebrow signal>Our capabilities</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="how-capabilities-title" size="h2" className="mt-6 max-w-[32rem]">
              {CAPABILITIES_INTRO.headline[0]} <span className="block">{CAPABILITIES_INTRO.headline[1]}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{CAPABILITIES_INTRO.copy}</p>
            <SiteLinkArrow href="/services" className="mt-4 min-h-[44px]">
              Explore Our Services
            </SiteLinkArrow>
          </SiteReveal>
        </div>

        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7 min-[1152px]:self-center">
          <SiteReveal className={styles.capGroups}>
            {SERVICE_GROUPS.map((group) => (
              <div key={group.key} className={styles.capGroup}>
                <h3 className={styles.capGroupName}>{group.name}</h3>
                <ul className={styles.capTiles}>
                  {group.capabilities.map((cap) => (
                    <li key={cap.slug}>
                      <Link href={`/services/${cap.slug}`} className={styles.capTile}>
                        <span aria-hidden="true" className={styles.capTileIcon}>
                          {CAPABILITY_ICONS[cap.icon]}
                        </span>
                        {cap.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </SiteReveal>
          {/* The relationship: capabilities feed INTO the process, stage by stage. */}
          <SiteReveal index={1} className={styles.rail}>
            <ol className={styles.railStages} aria-label="The process they enter">
              {PROCESS_STAGES.map((s, i) => (
                <li key={s.name} className={styles.railStage}>
                  <span aria-hidden="true" className={styles.railNode}>
                    {i + 1}
                  </span>
                  {s.name}
                </li>
              ))}
            </ol>
            <p className={styles.railNote}>{CAPABILITIES_INTRO.railNote}</p>
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 05 — What working together looks like ── */

export function WorkingTogether() {
  return (
    <SiteSection tone="white" aria-labelledby="how-working-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>Working together</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="how-working-title" size="h2" className="mt-6">
              {WORKING_INTRO.headline} <span className="block text-hb-blue">{WORKING_INTRO.headlineAccent}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[30rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{WORKING_INTRO.copy}</p>
          </SiteReveal>
        </div>
        <ol className={cn(styles.principles, 'col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-8')}>
          {WORKING_PRINCIPLES.map((p, i) => (
            <SiteReveal as="li" key={p.name} index={i % 3} className={styles.principle}>
              <h3 className="font-hb-display text-[1.25rem] font-bold leading-tight tracking-[-0.02em] text-hb-fg">{p.name}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{p.text}</p>
            </SiteReveal>
          ))}
        </ol>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 06 — Client Portal: the operational transparency layer ──
   Copy and preview use ONLY audited client-facing features. The preview is a
   simplified, anonymised illustration of the real dashboard structure (real
   sidebar labels, real stat cards, real project status/progress/milestones
   pattern) with example values — no client data. */

function PortalPreview() {
  return (
    <figure className={styles.portal}>
      <figcaption className="sr-only">
        Simplified illustration of the Hbee Client Portal dashboard, with example values: navigation, project counts, and a project with its
        status, progress and milestones.
      </figcaption>
      <div aria-hidden="true" className={styles.portalChrome}>
        <span />
        <span />
        <span />
        <p>Client Portal</p>
      </div>
      <div aria-hidden="true" className={styles.portalBody}>
        <nav className={styles.portalNav}>
          {PORTAL_NAV.map((n, i) => (
            <span key={n} className={i === 0 ? styles.portalNavActive : undefined}>
              {n}
            </span>
          ))}
        </nav>
        <div className={styles.portalMain}>
          <p className={styles.portalTitle}>Dashboard</p>
          <div className={styles.portalStats}>
            {[
              ['Active projects', '1'],
              ['Pending requests', '1'],
              ['Uploaded files', '6'],
              ['Deliverables', '3'],
            ].map(([k, v]) => (
              <div key={k} className={styles.portalStat}>
                <span>{v}</span>
                {k}
              </div>
            ))}
          </div>
          <div className={styles.portalProject}>
            <div className={styles.portalProjectHead}>
              <p>Example project</p>
              <span className={styles.portalPill}>In progress</span>
            </div>
            <div className={styles.portalProgress}>
              <span style={{ '--p': '60%' } as CSSProperties} />
            </div>
            <ul className={styles.portalMilestones}>
              <li data-done="">Discovery review</li>
              <li data-done="">Experience design</li>
              <li>Build and launch</li>
            </ul>
          </div>
        </div>
      </div>
      <p className={styles.portalNote}>Illustration with example values</p>
    </figure>
  )
}

export function ClientPortalSection() {
  return (
    <SiteSection tone="cloud" aria-labelledby="how-portal-title" className={styles.portalSection}>
      <SiteGrid className="items-center gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <SiteReveal>
            <SiteEyebrow signal>Your client experience</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="how-portal-title" size="h2" className="mt-6">
              {PORTAL_INTRO.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{PORTAL_INTRO.copy}</p>
          </SiteReveal>
          <ul className={styles.benefits}>
            {PORTAL_BENEFITS.map((b, i) => (
              <SiteReveal as="li" key={b.name} index={i} className={styles.benefit}>
                <h3 className="font-hb-display text-[1.0625rem] font-semibold leading-snug text-hb-fg">{b.name}</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-hb-fg-body">{b.text}</p>
              </SiteReveal>
            ))}
          </ul>
          <SiteReveal index={3} className="mt-8 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href={UTILITY_NAV.href} variant="secondary" size="lg">
              Open Client Portal
            </SiteButton>
          </SiteReveal>
        </div>
        <SiteReveal motion="focus" index={1} className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7">
          <PortalPreview />
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 07 — Final CTA (Night) ── */

export function HowWeWorkCta() {
  return (
    <SiteSection tone="night" aria-labelledby="how-cta-title" className="overflow-hidden">
      <div aria-hidden="true" className={capabilityStyles.ctaGeometry}>
        <HbeeModuleGlyph signal="none" className={capabilityStyles.ctaGlyph} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph2}`} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph3}`} />
      </div>
      <div className="relative max-w-[44rem]">
        <SiteReveal>
          <SiteEyebrow signal>{HOW_CTA.eyebrow}</SiteEyebrow>
        </SiteReveal>
        <SiteReveal index={1}>
          <SiteDisplayHeading id="how-cta-title" size="h1" className="mt-6">
            {HOW_CTA.headline}
          </SiteDisplayHeading>
        </SiteReveal>
        <SiteReveal index={2}>
          <p className="mt-6 max-w-[36rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">{HOW_CTA.copy}</p>
        </SiteReveal>
        <SiteReveal index={3} className="mt-9 flex flex-wrap items-center gap-3">
          <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
            Start Growth Review
          </SiteButton>
          <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
            Talk to Our Team
          </SiteButton>
        </SiteReveal>
      </div>
    </SiteSection>
  )
}
