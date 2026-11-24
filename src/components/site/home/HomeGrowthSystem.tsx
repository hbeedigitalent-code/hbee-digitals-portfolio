import { SiteReveal } from '../motion/SiteReveal'
import { SiteScene } from '../motion/SiteScene'
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
        <SiteReveal motion="none" className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteEyebrow signal motionIndex={0}>The Hbee Growth System</SiteEyebrow>
          <SiteDisplayHeading
            id="home-system-title"
            size="h2"
            className="mt-6"
            motionIndex={1}
            lines={['We start with', 'the business.', <span key="s" className="text-hb-blue">Not the service.</span>]}
          />
        </SiteReveal>
        <SiteReveal motion="soft" index={5} className="col-span-4 self-end md:col-span-8 lg:col-span-5 lg:col-start-8">
          <SiteLede>
            Before recommending a website rebuild, a campaign, a creative system or any other deliverable, Hbee first
            identifies what deserves attention.
          </SiteLede>
          <SiteLinkArrow href="/how-we-work" className="mt-5">
            How we work
          </SiteLinkArrow>
        </SiteReveal>
      </SiteGrid>

      {/* Reversible scene (--hb-p): the rail draws, the Signal travels and each stage resolves as the track passes
          through the viewport; scrolling back up un-draws it. Nothing is pinned. Final state = complete rail. */}
      <SiteScene anchor="center" from={0.85} to={0.5} compact={{ from: 0.95, to: 0.4 }} className={`${styles.track} mt-16`}>
        <span aria-hidden="true" data-layer="" style={{ '--s': 0, '--e': 0.78 } as React.CSSProperties} className={styles.trackLine} />
        <span aria-hidden="true" className={styles.trackSignalPath}>
          <span data-layer="" style={{ '--s': 0.2, '--e': 1 } as React.CSSProperties} className={styles.trackSignal} />
        </span>
        <ol className={`${styles.stageList} grid gap-14 lg:grid-cols-5 lg:gap-6`}>
          {STAGES.map((stage, i) => (
            <li
              key={stage.name}
              data-layer=""
              style={{ '--s': i * 0.15, '--e': i * 0.15 + 0.22 } as React.CSSProperties}
              className={`${styles.stage} lg:flex lg:flex-col lg:items-center lg:text-center`}
            >
              <span aria-hidden="true" className={styles.trackNode}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-6 font-hb-display text-[clamp(1.625rem,1.35rem+0.8vw,2rem)] font-bold leading-[1.1] tracking-[-0.03em] text-hb-fg lg:mt-8">
                <span className="sr-only">Stage {i + 1}: </span>
                {stage.name}
              </h3>
              <p className="mt-3 max-w-[17rem] text-[1rem] leading-relaxed text-hb-fg-body">{stage.text}</p>
            </li>
          ))}
        </ol>
      </SiteScene>
    </SiteSection>
  )
}
