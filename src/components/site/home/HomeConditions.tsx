import { SiteReveal } from '../motion/SiteReveal'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { CONDITIONS } from './home-content'
import styles from './home.module.css'

/**
 * 05 — Six growth conditions. An editorial index on a structural rail
 * (one node per condition), not six cards. Vertical on every width; the
 * intro stays pinned beside it on desktop.
 */
export function HomeConditions() {
  return (
    <SiteSection tone="deep" aria-labelledby="home-conditions-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--hb-header-height)+3rem)]">
            <SiteReveal>
              <SiteEyebrow>Six growth conditions</SiteEyebrow>
            </SiteReveal>
            <SiteReveal index={1}>
              <SiteDisplayHeading id="home-conditions-title" size="h2" className="mt-6">
                What lasting growth depends on.
              </SiteDisplayHeading>
            </SiteReveal>
            <SiteReveal index={2}>
              <SiteLede className="mt-5">
                Hbee looks at every business through the same six conditions. When one is weak, it limits what the
                others can do.
              </SiteLede>
            </SiteReveal>
          </div>
        </div>

        <ol className={`${styles.rail} col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6`}>
          {CONDITIONS.map((c, i) => (
            <SiteReveal
              as="li"
              key={c.key}
              motion="shift"
              index={i}
              className="grid gap-3 border-b border-hb-border py-9 pl-8 last:border-b-0 sm:grid-cols-[3rem_minmax(0,13rem)_1fr] sm:items-baseline sm:gap-6 sm:py-8 xl:grid-cols-[3rem_15rem_1fr]"
            >
              <span className={`${styles.railNumber} font-hb-body text-[0.8125rem] font-semibold tabular-nums tracking-[0.08em] text-hb-link`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {/* The condition name is the methodology term — it leads. */}
              <h3 className="font-hb-display text-[clamp(1.875rem,1.45rem+1.2vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.035em] text-hb-fg">
                {c.name}
              </h3>
              <p className="max-w-[30rem] text-[1rem] leading-relaxed text-hb-fg-body">{c.question}</p>
            </SiteReveal>
          ))}
        </ol>
      </SiteGrid>
    </SiteSection>
  )
}
