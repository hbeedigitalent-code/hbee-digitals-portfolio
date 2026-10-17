import { ALL_WORK_HREF, CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { CAPABILITY_GROUPS } from '../home/home-content'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import type { CapabilityDetail } from './capability-content'
import styles from './capability.module.css'

/* ── 02 — The opportunity (Night) ──
   Editorial introduction left; three strategic outcomes right. Outcomes are
   named results, not metrics and not feature cards: each is a column under
   one shared structural rule, marked by a node. */

export function CapabilityOpportunity({ detail }: { detail: CapabilityDetail }) {
  const o = detail.opportunity
  return (
    <SiteSection tone="night" aria-labelledby="capability-opportunity-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <SiteReveal>
            <SiteEyebrow signal>The opportunity</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-opportunity-title" size="h2" className="mt-6 max-w-[30rem]">
              {o.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{o.copy}</p>
          </SiteReveal>
        </div>

        <ol className={`${styles.outcomes} col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7 min-[1152px]:self-center`}>
          {o.outcomes.map((outcome, i) => (
            <SiteReveal as="li" key={outcome.name} index={i} className={styles.outcome}>
              <h3 className="font-hb-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em] text-hb-fg">{outcome.name}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-hb-fg-body">{outcome.text}</p>
            </SiteReveal>
          ))}
        </ol>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 03 — What we do (Cloud) ──
   The workstream INSIDE this capability. Deliberately not called a process
   and not drawn as the canonical Hbee track (Assess → … → Optimize): one
   framed panel of four numbered steps (2 × 2 from 768px), a vertical
   sequence on phones. */

export function CapabilityApproach({ detail, name }: { detail: CapabilityDetail; name: string }) {
  const a = detail.approach
  // Reuse the existing homepage material rather than inventing a second service list.
  const deliverables = CAPABILITY_GROUPS.flatMap((group) => group.capabilities)
    .find((capability) => capability.slug === detail.slug)?.deliverables ?? []
  return (
    <SiteSection id="what-we-do" tone="cloud" aria-labelledby="capability-approach-title" className={styles.anchor}>
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5 min-[1152px]:self-center">
          <SiteReveal>
            <SiteEyebrow signal>What we do</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-approach-title" size="h2" className="mt-6 max-w-[34rem]">
              {a.headline} <span className="block text-hb-blue">{a.headlineAccent}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{a.copy}</p>
            <SiteLinkArrow href="/how-we-work" className="mt-4 min-h-[44px]">
              Our approach
            </SiteLinkArrow>
            {deliverables.length > 0 && (
              <div className="mt-6 border-l-2 border-hb-structure-soft pl-5">
                <h3 className="font-hb-display text-base font-semibold text-hb-fg">Typical deliverables</h3>
                <ul className="mt-3 space-y-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">
                  {deliverables.map((deliverable) => (
                    <li key={deliverable}>{deliverable}</li>
                  ))}
                </ul>
              </div>
            )}
          </SiteReveal>
        </div>

        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7 min-[1152px]:self-center">
          <p className={styles.stepsLabel}>Inside {name}</p>
          <SiteReveal motion="none" as="ol" className={styles.steps}>
            {a.steps.map((step, i) => (
              <SiteReveal as="li" key={step.name} index={i} className={styles.step}>
                <span aria-hidden="true" className={styles.stepNumber}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-hb-display text-[1.25rem] font-bold leading-tight tracking-[-0.02em] text-hb-fg">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.name}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{step.text}</p>
                </div>
              </SiteReveal>
            ))}
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 04 — Real work (Deep Navy) ──
   portfolio_items holds no verified project → capability relationship, so
   no project is attributed to this capability. The section always renders
   its compact honest state until that relationship exists (see the Phase 5
   report for the proposed data model). */

export function CapabilityWork({ detail }: { detail: CapabilityDetail }) {
  return (
    <SiteSection tone="deep" spacing="compact" aria-labelledby="capability-work-title">
      <SiteGrid className="items-end gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-8">
          <SiteReveal>
            <SiteEyebrow signal>Real work</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-work-title" size="h2" className="mt-6 max-w-[36rem]">
              {detail.work.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-5 max-w-[34rem] leading-relaxed text-hb-fg-body">{detail.work.empty}</p>
          </SiteReveal>
        </div>
        <SiteReveal index={3} className="col-span-4 md:col-span-8 lg:col-span-4 lg:justify-self-end">
          <SiteButton href={ALL_WORK_HREF} variant="secondary" size="lg" arrow>
            Explore Our Work
          </SiteButton>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 06 — Final Growth Review CTA (Night) ── */

export function CapabilityCta({ detail }: { detail: CapabilityDetail }) {
  return (
    <SiteSection tone="night" aria-labelledby="capability-cta-title" className="overflow-hidden">
      <div aria-hidden="true" className={styles.ctaGeometry}>
        <HbeeModuleGlyph signal="none" className={styles.ctaGlyph} />
        <HbeeModuleGlyph signal="none" className={`${styles.ctaGlyph} ${styles.ctaGlyph2}`} />
        <HbeeModuleGlyph signal="none" className={`${styles.ctaGlyph} ${styles.ctaGlyph3}`} />
      </div>
      <div className="relative max-w-[44rem]">
        <SiteReveal>
          <SiteEyebrow signal>{detail.cta.eyebrow}</SiteEyebrow>
        </SiteReveal>
        <SiteReveal index={1}>
          <SiteDisplayHeading id="capability-cta-title" size="h1" className="mt-6">
            {detail.cta.headline}
          </SiteDisplayHeading>
        </SiteReveal>
        <SiteReveal index={2}>
          <p className="mt-6 max-w-[36rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">{detail.cta.copy}</p>
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
