import { HomeModuleField } from './HomeModuleField'
import surface from '../module/hbee-surface.module.css'
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
        <SiteReveal motion="none" className="col-span-4 md:col-span-8 lg:col-span-5">
          <SiteEyebrow signal motionIndex={0}>The reality</SiteEyebrow>
          <SiteDisplayHeading id="home-problem-title" size="h1" className="mt-6" motionIndex={1} lines={['Growth rarely breaks', 'in just one place.']} />
          <SiteLede className="mt-6" motionIndex={4}>
            Most businesses don’t struggle from a lack of effort. They struggle because one part of the system is
            quietly holding the others back.
          </SiteLede>
        </SiteReveal>
        <div className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6">
          <HomeModuleField className="mx-auto max-w-[640px] lg:mr-0 lg:max-w-[760px]" />
        </div>
      </SiteGrid>

      <ul className="mt-16 grid grid-cols-1 gap-x-[var(--hb-grid-gap)] gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {SYMPTOMS.map((s, i) => (
          <SiteReveal as="li" key={s.seen} motion="item" index={i} className={surface.rule}>
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
