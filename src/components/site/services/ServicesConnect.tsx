import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import surface from '../module/hbee-surface.module.css'
import { CONNECT_INTRO } from './services-content'
import styles from './services.module.css'

/**
 * 04 — How the capabilities connect (White). Direct answer first, then the
 * four dependency pairs that make isolated fixes fail, then Hbee's response
 * (diagnose the connections, sequence the capabilities). This is where the
 * connected-growth positioning becomes explicit rather than implied.
 */
export function ServicesConnect() {
  return (
    <SiteSection id="how-capabilities-connect" tone="white" aria-labelledby="services-connect-title" className={styles.anchor}>
      <SiteGrid className="gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 xl:col-span-5">
          <SiteReveal>
            <SiteEyebrow signal>{CONNECT_INTRO.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="services-connect-title" size="h2" className="mt-6 max-w-[34rem]">
              {CONNECT_INTRO.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] font-medium leading-relaxed text-hb-fg">{CONNECT_INTRO.answer}</p>
            <p className="mt-5 max-w-[34rem] text-[1rem] leading-relaxed text-hb-fg-body">{CONNECT_INTRO.close}</p>
            <SiteLinkArrow href="/how-we-work" className="mt-4 min-h-[44px]">
              See how Hbee sequences the work
            </SiteLinkArrow>
          </SiteReveal>
        </div>

        <ul className="col-span-4 grid gap-8 md:col-span-8 lg:col-span-12 xl:col-span-7 xl:self-center">
          {CONNECT_INTRO.points.map((point, i) => (
            <SiteReveal as="li" key={point} index={i} className={surface.rule}>
              <p className="max-w-[40rem] text-[1.0625rem] leading-relaxed text-hb-fg">{point}</p>
            </SiteReveal>
          ))}
        </ul>
      </SiteGrid>
    </SiteSection>
  )
}
