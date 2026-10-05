import { CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteSection } from '../primitives/SiteSection'
import { SiteChevron } from '../primitives/SiteIcons'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { SERVICES_CTA, SERVICES_FAQ } from './services-content'
import styles from './services.module.css'

/* ── 05 — Growth Review CTA (Cloud, restrained dimensional background) ── */

export function ServicesCta() {
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="services-cta-title">
      <div className={styles.ctaPlane}>
        <div aria-hidden="true" className={styles.ctaField}>
          <svg className={styles.ctaGrid} viewBox="0 0 400 200" preserveAspectRatio="none" focusable="false">
            <g stroke="var(--hb-structure)" strokeOpacity="0.1" strokeWidth="1">
              <path d="M0 50H400M0 100H400M0 150H400" />
              <path d="M100 0V200M200 0V200M300 0V200" />
            </g>
          </svg>
          <HbeeModuleGlyph signal="quiet" className={styles.ctaGlyph} />
          <HbeeModuleGlyph signal="none" className={`${styles.ctaGlyph} ${styles.ctaGlyph2}`} />
          <HbeeModuleGlyph signal="none" className={`${styles.ctaGlyph} ${styles.ctaGlyph3}`} />
        </div>

        <div className="relative grid items-center gap-x-[var(--hb-grid-gap)] gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SiteReveal>
              <SiteEyebrow signal>Ready to build your growth plan</SiteEyebrow>
            </SiteReveal>
            <SiteReveal index={1}>
              <SiteDisplayHeading id="services-cta-title" size="h2" className="mt-6 max-w-[36rem]">
                {SERVICES_CTA.headline}
              </SiteDisplayHeading>
            </SiteReveal>
            <SiteReveal index={2}>
              <p className="mt-5 max-w-[36rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{SERVICES_CTA.copy}</p>
            </SiteReveal>
          </div>
          <SiteReveal index={3} className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
              Talk to Our Team
            </SiteButton>
          </SiteReveal>
        </div>
      </div>
    </SiteSection>
  )
}

/* ── 06 — FAQ (White, editorial) ──
   Native <details>/<summary>: keyboard (Enter/Space), focus and the
   expanded state come from the browser — no client JavaScript. Two columns
   from 1024px, filled column-first so tab order matches reading order. */

export function ServicesFaq() {
  const half = Math.ceil(SERVICES_FAQ.length / 2)
  const columns = [SERVICES_FAQ.slice(0, half), SERVICES_FAQ.slice(half)]
  return (
    <SiteSection tone="white" aria-labelledby="services-faq-title">
      <SiteReveal>
        <SiteEyebrow>Frequently asked questions</SiteEyebrow>
      </SiteReveal>
      <SiteReveal index={1}>
        <SiteDisplayHeading id="services-faq-title" size="h2" className="mt-6">
          Common questions.
        </SiteDisplayHeading>
      </SiteReveal>

      <div className="mt-12 grid items-start gap-x-[var(--hb-grid-gap)] gap-y-3 lg:grid-cols-2">
        {columns.map((col, c) => (
          <SiteReveal key={c} index={c + 2} className="flex flex-col gap-3">
            {col.map((item) => (
              <details key={item.question} className={styles.faq}>
                <summary className={styles.faqSummary}>
                  <h3 className="font-hb-body text-[1rem] font-semibold leading-snug text-hb-fg">{item.question}</h3>
                  <span aria-hidden="true" className={styles.faqIcon}>
                    <SiteChevron size={18} />
                  </span>
                </summary>
                <div className={styles.faqAnswer}>
                  <p className="max-w-[40rem] leading-relaxed text-hb-fg-body">{item.answer}</p>
                </div>
              </details>
            ))}
          </SiteReveal>
        ))}
      </div>
    </SiteSection>
  )
}
