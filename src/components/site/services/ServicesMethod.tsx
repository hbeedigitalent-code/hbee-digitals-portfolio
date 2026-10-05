import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { METHOD_INTRO, METHOD_STAGES } from './services-content'
import styles from './services.module.css'

/**
 * 03 — How Hbee uses the capabilities (Cloud).
 *
 * Methodology decision: the approved five-stage Hbee Growth System (Assess →
 * Prioritize → Build → Activate → Optimize), expressed through the
 * capabilities lens — not a second, four-stage process. The site header's
 * How We Work menu and the homepage already show these five stages; a
 * different numbered sequence here would contradict them.
 *
 * ≥1280: intro left; the stage track and the "not a bundle" statement right.
 * The orange Signal travels once along the track when revealed, then rests.
 * <1280: intro above; <1024 the stages become a vertical rail (no travel).
 */
export function ServicesMethod() {
  return (
    <SiteSection id="how-we-use-them" tone="cloud" aria-labelledby="services-method-title" className={styles.anchor}>
      <SiteGrid className="gap-y-14">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 xl:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>How we use them</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="services-method-title" size="h2" className="mt-6 max-w-[40rem]">
              {METHOD_INTRO.headline[0]} <span className="block text-hb-blue">{METHOD_INTRO.headline[1]}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[36rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{METHOD_INTRO.copy}</p>
            <SiteLinkArrow href="/how-we-work" className="mt-4 min-h-[44px]">
              Our approach
            </SiteLinkArrow>
          </SiteReveal>
        </div>

        <div className="col-span-4 md:col-span-8 lg:col-span-12 xl:col-span-8 xl:pt-2">
          <SiteReveal motion="none" className={styles.method}>
            <span aria-hidden="true" className={styles.methodLine} />
            <span aria-hidden="true" className={styles.methodSignal} />
            <ol className={styles.methodList}>
              {METHOD_STAGES.map((stage, i) => (
                <SiteReveal as="li" key={stage.name} index={i} className={styles.methodStage}>
                  <span aria-hidden="true" className={styles.methodNode} data-first={i === 0 ? '' : undefined}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-hb-display text-[clamp(1.375rem,1.2rem+0.35vw,1.5rem)] font-bold leading-tight tracking-[-0.025em] text-hb-fg">
                      <span className="sr-only">Stage {i + 1}: </span>
                      {stage.name}
                    </h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{stage.text}</p>
                  </div>
                </SiteReveal>
              ))}
            </ol>
          </SiteReveal>

          {/* The point the section exists to make: the client does not
              automatically buy all six. */}
          <SiteReveal index={2} className={styles.notBundle}>
            <p className="font-hb-display text-[clamp(1.25rem,1.15rem+0.4vw,1.5rem)] font-bold leading-tight tracking-[-0.025em] text-hb-fg">
              {METHOD_INTRO.notBundle.title}
            </p>
            <p className="text-[1rem] leading-relaxed text-hb-fg-body">{METHOD_INTRO.notBundle.text}</p>
          </SiteReveal>
        </div>
      </SiteGrid>
    </SiteSection>
  )
}
