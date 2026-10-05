import { HbeeModuleGroup } from '../module/HbeeModuleGroup'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { SYMPTOMS } from './home-content'

/**
 * 04 — The problem. The transition into Night: the same Hbee system,
 * drifted apart and with no orange signal — disconnection, not a new graphic.
 */
export function HomeProblem() {
  return (
    <SiteSection tone="night" aria-labelledby="home-problem-title" className="overflow-hidden">
      <SiteGrid className="items-center gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteReveal>
            <SiteEyebrow signal>The reality</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-problem-title" size="h1" className="mt-6">
              Growth rarely breaks <span className="lg:block">in just one place.</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <SiteLede className="mt-6">
              Most businesses don’t struggle from a lack of effort. They struggle because one part of the system is
              quietly holding the others back.
            </SiteLede>
          </SiteReveal>
        </div>
        <div className="col-span-4 hidden md:col-span-8 md:block lg:col-span-5 lg:col-start-8">
          <HbeeModuleGroup idPrefix="problem" state="fragmented" label="The same six parts, disconnected." className="mx-auto max-w-[460px]" />
        </div>
      </SiteGrid>

      <ul className="mt-16 grid grid-cols-1 gap-x-[var(--hb-grid-gap)] gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {SYMPTOMS.map((s, i) => (
          <SiteReveal as="li" key={s.seen} index={i} className="border-t-2 border-[rgba(29,110,255,0.55)] pt-6">
            {/* Primary observation leads; the consequence follows, quieter. */}
            <p className="font-hb-display text-[clamp(1.375rem,1.15rem+0.6vw,1.625rem)] font-bold leading-[1.2] tracking-[-0.02em] text-hb-fg">
              {s.seen}
            </p>
            <p className="mt-2.5 text-[1rem] leading-relaxed text-hb-fg-muted">{s.underneath}</p>
          </SiteReveal>
        ))}
      </ul>
    </SiteSection>
  )
}
