import Link from 'next/link'
import { GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import surface from '../module/hbee-surface.module.css'
import { CAPABILITY_ENTITIES, MERCHANT_SYMPTOMS } from './capability-entities'
import { SYMPTOMS_INTRO } from './services-content'
import styles from './services.module.css'

/**
 * 03 — Symptom routing (Night). Merchants recognize a problem before they can
 * name a service. Each symptom is a heading + one-sentence explanation + a
 * descriptive link to the capability most likely to address it. Where the
 * issue belongs to a named service area (Product & Offer), the area is named
 * and the link goes to its section on the Website & Conversion page.
 *
 * Plain list semantics; each destination is a crawlable anchor with
 * descriptive text.
 */
export function ServicesSymptoms() {
  return (
    <SiteSection id="symptoms" tone="night" aria-labelledby="services-symptoms-title" className={styles.anchor}>
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 xl:col-span-4">
          <SiteReveal>
            <SiteEyebrow signal>{SYMPTOMS_INTRO.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="services-symptoms-title" size="h2" className="mt-6 max-w-[34rem]">
              {SYMPTOMS_INTRO.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{SYMPTOMS_INTRO.copy}</p>
            <SiteLinkArrow href={GROWTH_REVIEW_HREF} className="mt-4 min-h-[44px]">
              Not sure which applies? Start a Growth Review
            </SiteLinkArrow>
          </SiteReveal>
        </div>

        <ul className="col-span-4 grid gap-x-[var(--hb-grid-gap)] gap-y-10 md:col-span-8 md:grid-cols-2 lg:col-span-12 xl:col-span-8">
          {MERCHANT_SYMPTOMS.map((item, i) => {
            const target = CAPABILITY_ENTITIES[item.capability]
            return (
              <SiteReveal as="li" key={item.symptom} index={i} className={surface.rule}>
                <h3 className="font-hb-display text-[1.1875rem] font-bold leading-snug tracking-[-0.02em] text-hb-fg">{item.symptom}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{item.explanation}</p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-hb-fg-body">
                  {item.serviceArea ? (
                    <>
                      Service area: <strong className="font-semibold text-hb-fg">{item.serviceArea}</strong>, within{' '}
                    </>
                  ) : (
                    <>Capability: </>
                  )}
                  <Link
                    href={`${target.href}${item.anchor ?? ''}`}
                    className="inline-flex min-h-[44px] items-center font-semibold text-hb-link underline underline-offset-4"
                  >
                    {target.name}
                  </Link>
                </p>
              </SiteReveal>
            )
          })}
        </ul>
      </SiteGrid>
    </SiteSection>
  )
}
