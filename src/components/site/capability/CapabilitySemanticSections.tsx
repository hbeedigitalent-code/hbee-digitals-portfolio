import Link from 'next/link'
import { GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { CapabilityModuleCard } from '../module/CapabilityModuleCard'
import surface from '../module/hbee-surface.module.css'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { CAPABILITY_ENTITIES, CAPABILITY_ORDER, capabilityEntity } from '../services/capability-entities'
import type { CapabilityDetail } from './capability-content'
import type { QuestionIntent } from './capability-semantic'
import styles from './capability.module.css'

/* Semantic sections for capability pages that provide `detail.semantic`.
   Each answer-bearing passage is plain HTML under a meaningful heading, so it
   can be read, quoted and linked on its own. */

/* ── Merchant symptoms + what we diagnose (White) ── */

export function CapabilitySymptomsDiagnose({ detail }: { detail: CapabilityDetail }) {
  const s = detail.semantic
  if (!s) return null
  return (
    <SiteSection id="symptoms-and-diagnosis" tone="white" aria-labelledby="capability-symptoms-title" className={styles.anchor}>
      <SiteGrid className="gap-y-16">
        <div className="col-span-4 md:col-span-8 lg:col-span-12">
          <SiteReveal>
            <SiteEyebrow signal>{s.symptoms.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-symptoms-title" size="h2" className="mt-6 max-w-[40rem]">
              {s.symptoms.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <ul className="mt-10 grid gap-x-[var(--hb-grid-gap)] gap-y-8 md:grid-cols-2 xl:grid-cols-3">
            {s.symptoms.items.map((item, i) => (
              <SiteReveal as="li" key={item.name} index={i} className={surface.rule}>
                <h3 className="font-hb-display text-[1.1875rem] font-bold leading-snug tracking-[-0.02em] text-hb-fg">{item.name}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{item.text}</p>
              </SiteReveal>
            ))}
          </ul>
        </div>

        <div id="what-we-diagnose" className={`col-span-4 md:col-span-8 lg:col-span-12 ${styles.anchor}`}>
          <SiteReveal>
            <SiteEyebrow signal>{s.diagnose.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-diagnose-title" size="h2" className="mt-6 max-w-[40rem]">
              {s.diagnose.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[44rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{s.diagnose.intro}</p>
          </SiteReveal>
          <ol className="mt-10 grid gap-x-[var(--hb-grid-gap)] gap-y-8 md:grid-cols-2">
            {s.diagnose.items.map((item, i) => (
              <SiteReveal as="li" key={item.name} index={i} className={surface.rule}>
                <h3 className="font-hb-display text-[1.1875rem] font-bold leading-snug tracking-[-0.02em] text-hb-fg">
                  <span aria-hidden="true" className="mr-2 text-hb-blue">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {item.name}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{item.text}</p>
              </SiteReveal>
            ))}
          </ol>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── Service area inside the capability (White, Mist panel) ── */

export function CapabilityServiceArea({ detail }: { detail: CapabilityDetail }) {
  const area = detail.semantic?.serviceArea
  if (!area) return null
  return (
    <SiteSection id={area.id} tone="white" spacing="compact" aria-labelledby="capability-area-title" className={styles.anchor}>
      <div className={`${surface.surface} ${surface.soft} ${styles.areaPanel}`}>
        <SiteReveal>
          <SiteEyebrow signal>Service area</SiteEyebrow>
        </SiteReveal>
        <SiteReveal index={1}>
          <SiteDisplayHeading id="capability-area-title" size="h2" className="mt-6 max-w-[44rem]">
            {area.title}
          </SiteDisplayHeading>
        </SiteReveal>
        <SiteReveal index={2}>
          <p className="mt-6 max-w-[46rem] text-[1.0625rem] font-medium leading-relaxed text-hb-fg">{area.answer}</p>
        </SiteReveal>
        <ul className="mt-8 grid gap-x-[var(--hb-grid-gap)] gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          {area.topics.map((topic) => (
            <li key={topic.name}>
              <h3 className="font-hb-display text-[1.0625rem] font-bold leading-snug tracking-[-0.01em] text-hb-fg">{topic.name}</h3>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-hb-fg-body">{topic.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[46rem] text-[0.9375rem] leading-relaxed text-hb-fg-body">
          {area.connection.text}{' '}
          <Link href={area.connection.link.href} className="font-semibold text-hb-link underline underline-offset-4">
            {area.connection.link.label}
          </Link>
          .
        </p>
        {area.links && (
          <ul className="mt-3 space-y-1">
            {area.links.map((link) => (
              <li key={link.href}>
                <SiteLinkArrow href={link.href} className="min-h-[44px]">
                  {link.label}
                </SiteLinkArrow>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteSection>
  )
}

/* ── Questions merchants ask, grouped by search intent (Night) ──
   Visible question + direct answer, not a collapsed accordion, so each
   passage is quotable on its own. The intent label is a visible group name. */

const INTENT_LABEL: Record<QuestionIntent, string> = {
  Definition: 'What it is',
  Problem: 'Why it happens',
  Evaluation: 'Whether you need it',
  Comparison: 'Comparing options',
  Commercial: 'What to expect',
  Diagnostic: 'Finding the cause',
}

export function CapabilityQuestions({ detail }: { detail: CapabilityDetail }) {
  const q = detail.semantic?.questions
  if (!q) return null
  const groups = (Object.keys(INTENT_LABEL) as QuestionIntent[])
    .map((intent) => ({ intent, items: q.items.filter((item) => item.intent === intent) }))
    .filter((group) => group.items.length > 0)

  return (
    <SiteSection id="questions" tone="night" aria-labelledby="capability-questions-title" className={styles.anchor}>
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 xl:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>Questions merchants ask</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-questions-title" size="h2" className="mt-6 max-w-[30rem]">
              {q.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[30rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{q.intro}</p>
          </SiteReveal>
        </div>

        <div className="col-span-4 grid gap-12 md:col-span-8 lg:col-span-12 xl:col-span-8">
          {groups.map((group) => (
            <section key={group.intent} aria-label={INTENT_LABEL[group.intent]}>
              <p className={styles.intentLabel}>{INTENT_LABEL[group.intent]}</p>
              <div className="mt-4 grid gap-8">
                {group.items.map((item) => (
                  <SiteReveal key={item.question} className={surface.rule}>
                    <h3 className="font-hb-display text-[1.25rem] font-bold leading-snug tracking-[-0.02em] text-hb-fg">{item.question}</h3>
                    <p className="mt-3 max-w-[46rem] text-[1rem] leading-relaxed text-hb-fg-body">{item.answer}</p>
                    {item.links && (
                      <ul className="mt-2 flex flex-wrap gap-x-6">
                        {item.links.map((link) => (
                          <li key={link.href}>
                            <SiteLinkArrow href={link.href} className="min-h-[44px]">
                              {link.label}
                            </SiteLinkArrow>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SiteReveal>
                ))}
              </div>
            </section>
          ))}
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── Connected capabilities (White) — module cards as navigation ──
   The active capability is dominant; its adjacent capabilities are linked
   and carry what they give this one; the rest recede but stay linked. */

export function CapabilityConnected({ detail }: { detail: CapabilityDetail }) {
  const active = capabilityEntity(detail.slug)
  if (!active) return null
  const rest = CAPABILITY_ORDER.filter((slug) => slug !== active.slug)
  const adjacent = active.adjacent
  const receded = rest.filter((slug) => !adjacent.includes(slug))
  const fit = detail.systemFit

  return (
    <SiteSection id="connected-capabilities" tone="white" aria-labelledby="capability-connected-title" className={styles.anchor}>
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12">
          <SiteReveal>
            <SiteEyebrow signal>Connected capabilities</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="capability-connected-title" size="h2" className="mt-6 max-w-[44rem]">
              How {active.name} depends on the rest of the system.
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[44rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{fit.copy}</p>
          </SiteReveal>
        </div>

        <div className="col-span-4 grid gap-5 md:col-span-8 lg:col-span-12">
          <SiteReveal>
            <CapabilityModuleCard entity={active} state="active" headingLevel="h3" signal />
          </SiteReveal>
          <ul className="grid gap-5 lg:grid-cols-3" aria-label={`Capabilities adjacent to ${active.name}`}>
            {adjacent.map((slug, i) => (
              <SiteReveal as="li" key={slug} index={i}>
                <CapabilityModuleCard entity={CAPABILITY_ENTITIES[slug]} state="related" headingLevel="h3" relation={fit.relations[slug]} className="h-full" />
              </SiteReveal>
            ))}
          </ul>
          {receded.length > 0 && (
            <ul className="grid gap-5 md:grid-cols-2" aria-label="Other Hbee capabilities">
              {receded.map((slug, i) => (
                <SiteReveal as="li" key={slug} index={i}>
                  <CapabilityModuleCard entity={CAPABILITY_ENTITIES[slug]} state="muted" headingLevel="h3" relation={fit.relations[slug]} className="h-full" />
                </SiteReveal>
              ))}
            </ul>
          )}
        </div>

        <SiteReveal className="col-span-4 md:col-span-8 lg:col-span-12">
          <SiteLinkArrow href="/services#capabilities" className="min-h-[44px]">
            Explore all six Hbee capabilities
          </SiteLinkArrow>
          <span className="mx-3 text-hb-fg-muted" aria-hidden="true">
            ·
          </span>
          <SiteLinkArrow href={GROWTH_REVIEW_HREF} className="min-h-[44px]">
            Not sure which constraint comes first? Start a Growth Review
          </SiteLinkArrow>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}
