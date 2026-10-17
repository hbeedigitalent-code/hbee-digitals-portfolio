import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { CAPABILITY_GROUPS } from './home-content'
import styles from './home.module.css'

/**
 * 07 — Capabilities. Three groups (Foundation · Activation · Growth), each
 * holding two capabilities that lead with business purpose, then
 * deliverables. Design-controlled copy; existing `services` records are
 * untouched in this phase.
 */
export function HomeCapabilities() {
  return (
    <SiteSection tone="white" aria-labelledby="home-capabilities-title">
      <SiteGrid className="gap-y-6">
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteReveal>
            <SiteEyebrow>Capabilities</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-capabilities-title" size="h2" className="mt-6">
              What we bring together.
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <SiteReveal index={2} className="col-span-4 self-end md:col-span-8 lg:col-span-5 lg:col-start-8">
          <SiteLede>Six capabilities, organized around what a business needs to grow: a foundation, activation and growth.</SiteLede>
        </SiteReveal>
      </SiteGrid>

      <div className="mt-14 grid gap-[var(--hb-grid-gap)] lg:grid-cols-3">
        {CAPABILITY_GROUPS.map((group, g) => (
          <SiteReveal key={group.name} index={g} className="flex">
            <section
              aria-labelledby={`cap-group-${g}`}
              className="flex w-full flex-col rounded-[var(--hb-radius-xs)] rounded-br-[var(--hb-radius-sweep)] bg-hb-mist p-7 md:p-9"
            >
            <div className="flex items-center gap-3">
              <HbeeModuleGlyph size={26} signal={group.name === 'Growth' ? 'signal' : 'quiet'} />
              <h3 id={`cap-group-${g}`} className="font-hb-body text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-link">
                {group.name}
              </h3>
            </div>
            {/* The group statement leads; its two capabilities sit beneath it as
                parts of one group, joined by a single structural edge. */}
            <p className="mt-4 font-hb-display text-[clamp(1.375rem,1.2rem+0.5vw,1.625rem)] font-bold leading-[1.2] tracking-[-0.025em] text-hb-fg">
              {group.summary}
            </p>

            <div className="mt-8 flex flex-1 flex-col divide-y divide-[color:var(--hb-border)] border-l-2 border-[color:var(--hb-structure-soft)] pl-5 md:pl-6">
              {group.capabilities.map((cap) => (
                <div key={cap.name} className="py-7 first:pt-0 last:pb-0 md:py-6">
                  <h4 className="font-hb-display text-[1.25rem] font-semibold leading-snug tracking-[-0.015em] text-hb-fg">
                    <SiteLinkArrow href={`/services/${cap.slug}`} className="min-h-[44px]">
                      {cap.name}
                    </SiteLinkArrow>
                  </h4>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-ink">{cap.purpose}</p>
                  <ul className="mt-3 flex flex-col gap-1 text-[0.875rem] leading-snug text-hb-fg-body">
                    {cap.deliverables.map((d) => (
                      <li key={d} className={styles.deliverable}>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            </section>
          </SiteReveal>
        ))}
      </div>

      <div className="mt-10">
        <SiteLinkArrow href="/services">Explore services</SiteLinkArrow>
      </div>
    </SiteSection>
  )
}
