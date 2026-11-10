import { cn } from '@/lib/cn'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import surface from '../module/hbee-surface.module.css'
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
 *
 * Hbee Surface modules with a deliberate hierarchy instead of three identical
 * slabs: Foundation is the neutral base (outlined), Activation is blue-led
 * (Mist), Growth is the one stronger brand moment (Royal Blue) and carries the
 * orange Signal Insert, the same activation cue as the Growth System track.
 * Every surface has the Sweep corner and the Open Channel with its Connection Gap.
 */
const SURFACE = [surface.base, surface.soft, surface.blue] as const

export function HomeCapabilities() {
  return (
    <SiteSection tone="white" aria-labelledby="home-capabilities-title">
      <SiteGrid className="gap-y-6">
        <SiteReveal motion="none" className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteEyebrow motionIndex={0}>Capabilities</SiteEyebrow>
          <SiteDisplayHeading id="home-capabilities-title" size="h2" className="mt-6" motionIndex={1} lines={['What we bring together.']} />
        </SiteReveal>
        <SiteReveal motion="soft" index={3} className="col-span-4 self-end md:col-span-8 lg:col-span-5 lg:col-start-8">
          <SiteLede>Six capabilities, organized around what a business needs to grow: a foundation, activation and growth.</SiteLede>
        </SiteReveal>
      </SiteGrid>

      <div className="mt-12 grid gap-[var(--hb-grid-gap)] lg:mt-14 lg:grid-cols-3">
        {CAPABILITY_GROUPS.map((group, g) => (
          <SiteReveal key={group.name} motion="card" index={g} className="flex">
            <section
              aria-labelledby={`cap-group-${g}`}
              className={cn(surface.surface, surface.interactive, SURFACE[g] ?? surface.soft, 'flex w-full flex-col px-6 pb-8 pt-9 sm:px-8 sm:pb-10 lg:px-9')}
            >
              <div className="flex items-center gap-3">
                <HbeeModuleGlyph size={26} signal={g === 2 ? 'signal' : 'quiet'} />
                <h3 id={`cap-group-${g}`} className="font-hb-body text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-link">
                  {group.name}
                </h3>
                {/* System marker: decorative order of the three groups. */}
                <span aria-hidden="true" className="ml-auto font-hb-body text-[0.8125rem] font-semibold tabular-nums tracking-[0.08em] text-hb-fg-muted">
                  {String(g + 1).padStart(2, '0')}
                </span>
              </div>
              {/* The group statement leads; its two capabilities sit beneath it as
                  parts of one group, joined by a single structural edge. */}
              <p className="mt-5 max-w-[20ch] font-hb-display text-[clamp(1.5rem,1.25rem+0.7vw,1.875rem)] font-bold leading-[1.15] tracking-[-0.03em] text-hb-fg">
                {group.summary}
              </p>

              <div className="mt-8 flex flex-1 flex-col divide-y divide-[color:var(--hb-border)] border-l-2 border-[color:var(--hb-structure-soft)] pl-5 md:pl-6">
                {group.capabilities.map((cap) => (
                  <div key={cap.name} className="py-5 first:pt-0 last:pb-0 md:py-6">
                    <h4 className="font-hb-display text-[1.25rem] font-semibold leading-snug tracking-[-0.015em] text-hb-fg">
                      <SiteLinkArrow href={`/services/${cap.slug}`} className="min-h-[44px]">
                        {cap.name}
                      </SiteLinkArrow>
                    </h4>
                    <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-hb-fg">{cap.purpose}</p>
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
