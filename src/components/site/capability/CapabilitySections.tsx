import { ALL_INSIGHTS_HREF, ALL_WORK_HREF, CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import type { InsightSummary } from '@/lib/site/insights-data'
import type { WorkItem } from '@/lib/site/work-data'
import { CAPABILITY_GROUPS } from '../home/home-content'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteChevron } from '../primitives/SiteIcons'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import type { CapabilityDetail } from './capability-content'
import servicesStyles from '../services/services.module.css'
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
            <p className="mt-5 max-w-[34rem] border-l-2 border-hb-structure-soft pl-5 text-[0.9375rem] leading-relaxed text-hb-fg-body">
              <strong className="font-semibold text-hb-fg">Best suited to:</strong> {o.bestFor}
            </p>
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
                <h3 className="font-hb-display text-base font-semibold text-hb-fg">Depending on the engagement, work may include</h3>
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

/* Explicit published assignments only; the safe empty state remains. */

export function CapabilityWork({ detail, work = [], insights = [] }: { detail: CapabilityDetail; work?: WorkItem[]; insights?: InsightSummary[] }) {
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
            {work.length ? <ul className="mt-5 space-y-4">{work.slice(0, 3).map((item) => <li key={item.id}><SiteLinkArrow href={item.href} className="min-h-[44px]">{item.title ? `${item.client} — ${item.title}` : item.client}</SiteLinkArrow></li>)}</ul> : <p className="mt-5 max-w-[34rem] leading-relaxed text-hb-fg-body">{detail.work.empty}</p>}
          </SiteReveal>
        </div>
        <SiteReveal index={3} className="col-span-4 md:col-span-8 lg:col-span-4 lg:justify-self-end">
          <SiteButton href={ALL_WORK_HREF} variant="secondary" size="lg" arrow>
            Explore Our Work
          </SiteButton>
        </SiteReveal>
      </SiteGrid>
      {insights.length > 0 && (
        <SiteGrid className="mt-12 gap-y-8 border-t border-hb-border pt-10">
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <SiteReveal>
              <SiteEyebrow signal>Related insights</SiteEyebrow>
            </SiteReveal>
            <SiteReveal index={1}>
              <p className="mt-4 max-w-[28rem] leading-relaxed text-hb-fg-body">
                Practical thinking connected to this capability and the problems it helps solve.
              </p>
              <SiteLinkArrow href={ALL_INSIGHTS_HREF} className="mt-4 min-h-[44px]">
                Explore all Insights
              </SiteLinkArrow>
            </SiteReveal>
          </div>
          <ul className="col-span-4 space-y-4 md:col-span-8 lg:col-span-8">
            {insights.map((insight, index) => (
              <SiteReveal as="li" key={insight.id} index={index + 2}>
                <SiteLinkArrow href={insight.href} className="min-h-[44px]">
                  {insight.title}
                </SiteLinkArrow>
              </SiteReveal>
            ))}
          </ul>
        </SiteGrid>
      )}
    </SiteSection>
  )
}

/* Buyer questions, using the same native disclosure pattern as /services. */

export function CapabilityFaq({ detail }: { detail: CapabilityDetail }) {
  const half = Math.ceil(detail.faq.length / 2)
  const columns = [detail.faq.slice(0, half), detail.faq.slice(half)]
  return (
    <SiteSection tone="white" aria-labelledby="capability-faq-title">
      <SiteReveal>
        <SiteEyebrow>Frequently asked questions</SiteEyebrow>
      </SiteReveal>
      <SiteReveal index={1}>
        <SiteDisplayHeading id="capability-faq-title" size="h2" className="mt-6">
          Questions before the work begins.
        </SiteDisplayHeading>
      </SiteReveal>
      <div className="mt-12 grid items-start gap-x-[var(--hb-grid-gap)] gap-y-3 lg:grid-cols-2">
        {columns.map((column, columnIndex) => (
          <SiteReveal key={columnIndex} index={columnIndex + 2} className="flex flex-col gap-3">
            {column.map((item) => (
              <details key={item.question} className={servicesStyles.faq}>
                <summary className={servicesStyles.faqSummary}>
                  <h3 className="font-hb-body text-[1rem] font-semibold leading-snug text-hb-fg">{item.question}</h3>
                  <span aria-hidden="true" className={servicesStyles.faqIcon}>
                    <SiteChevron size={18} />
                  </span>
                </summary>
                <div className={servicesStyles.faqAnswer}>
                  <p className="max-w-[40rem] leading-relaxed text-hb-fg-body">{item.answer}</p>
                </div>
              </details>
            ))}
          </SiteReveal>
        ))}
      </div>
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
            Start a Growth Review
          </SiteButton>
          <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
            {detail.cta.secondaryLabel}
          </SiteButton>
        </SiteReveal>
      </div>
    </SiteSection>
  )
}
