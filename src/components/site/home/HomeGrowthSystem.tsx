import { SiteReveal } from '../motion/SiteReveal'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { STAGES } from './home-content'
import styles from './home.module.css'

/**
 * 06 — Hbee Growth System. Back to a light environment.
 * Desktop: five stages on one track; the orange Signal travels once from
 * Assess to Optimize when the track is revealed, then rests.
 * Below 1024px: a vertical sequence on a rail.
 */
export function HomeGrowthSystem() {
  return (
    <SiteSection tone="cloud" aria-labelledby="home-system-title">
      <SiteGrid className="gap-y-6">
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteReveal>
            <SiteEyebrow signal>The Hbee Growth System</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-system-title" size="h2" className="mt-6">
              We start with the business. <span className="block text-hb-blue">Not the service.</span>
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <SiteReveal index={2} className="col-span-4 self-end md:col-span-8 lg:col-span-5 lg:col-start-8">
          <SiteLede>
            Before recommending a website rebuild, a campaign, a creative system or any other deliverable, Hbee first
            identifies what deserves attention.
          </SiteLede>
          <SiteLinkArrow href="/how-we-work" className="mt-5">
            How we work
          </SiteLinkArrow>
        </SiteReveal>
      </SiteGrid>

      <SiteReveal motion="none" className={`${styles.track} mt-16`}>
        <span aria-hidden="true" className={styles.trackLine} />
        <span aria-hidden="true" className={styles.trackSignal} />
        <ol className={`${styles.stageList} grid gap-14 lg:grid-cols-5 lg:gap-6`}>
          {STAGES.map((stage, i) => (
            <SiteReveal as="li" key={stage.name} index={i} className="lg:flex lg:flex-col lg:items-center lg:text-center">
              <span aria-hidden="true" className={styles.trackNode}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-6 font-hb-display text-[clamp(1.625rem,1.35rem+0.8vw,2rem)] font-bold leading-[1.1] tracking-[-0.03em] text-hb-fg lg:mt-8">
                <span className="sr-only">Stage {i + 1}: </span>
                {stage.name}
              </h3>
              <p className="mt-3 max-w-[17rem] text-[1rem] leading-relaxed text-hb-fg-body">{stage.text}</p>
            </SiteReveal>
          ))}
        </ol>
      </SiteReveal>
    </SiteSection>
  )
}
