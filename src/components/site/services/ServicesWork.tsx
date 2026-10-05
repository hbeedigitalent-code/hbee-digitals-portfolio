import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { FeaturedWork } from '@/lib/site/home-data'
import { ALL_WORK_HREF, caseStudyHref } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteTag } from '../primitives/SiteCard'
import { SiteImage } from '../primitives/SiteImage'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { SiteArrow } from '../primitives/SiteIcons'
import { WORK_INTRO } from './services-content'
import homeStyles from '../home/home.module.css'
import styles from './services.module.css'

/**
 * 04 — Real work (Deep Navy), from real portfolio_items rows via the same
 * server-side loader as the homepage (getFeaturedWork: anon client, RLS,
 * never throws).
 *
 * Truthfulness rules for this page:
 *   - no headline metrics: the CMS metric fields carry no verification flag,
 *     so they are not presented here as proof (the homepage loader's
 *     `result` is deliberately ignored);
 *   - no capability attribution: rows record technologies, not which Hbee
 *     capability was applied, so tags are shown as the CMS holds them.
 *
 * Empty: one compact band — heading, one honest line, the CTA. No
 * placeholders, no visual hole.
 */
export function ServicesWork({ work }: { work: FeaturedWork[] }) {
  const empty = work.length === 0
  return (
    <SiteSection tone="deep" spacing={empty ? 'compact' : 'default'} aria-labelledby="services-work-title">
      <SiteGrid className="items-end gap-y-10">
        <div className={cn('col-span-4 md:col-span-8', empty ? 'lg:col-span-8' : 'lg:col-span-12 xl:col-span-4 xl:self-start')}>
          <SiteReveal>
            <SiteEyebrow signal>Real work</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="services-work-title" size="h2" className="mt-6 max-w-[34rem]">
              {WORK_INTRO.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-5 max-w-[34rem] leading-relaxed text-hb-fg-body">{empty ? WORK_INTRO.empty : WORK_INTRO.copy}</p>
            {!empty && (
              <SiteButton href={ALL_WORK_HREF} variant="conversion" size="lg" arrow className="mt-8 hidden xl:inline-flex">
                Explore Our Work
              </SiteButton>
            )}
          </SiteReveal>
        </div>

        {empty ? (
          <SiteReveal index={3} className="col-span-4 md:col-span-8 lg:col-span-4 lg:justify-self-end">
            <SiteButton href={ALL_WORK_HREF} variant="secondary" size="lg" arrow>
              Explore Our Work
            </SiteButton>
          </SiteReveal>
        ) : (
          <>
            <ul
              className={cn(
                'col-span-4 grid gap-[var(--hb-grid-gap)] md:col-span-8 lg:col-span-12 xl:col-span-8',
                work.length > 1 && 'md:grid-cols-2',
                work.length > 2 && 'lg:grid-cols-3',
              )}
            >
              {work.map((item, i) => (
                <SiteReveal as="li" key={item.id} index={i} className="flex">
                  <WorkCard item={item} />
                </SiteReveal>
              ))}
            </ul>
            <div className="col-span-4 md:col-span-8 xl:hidden">
              <SiteButton href={ALL_WORK_HREF} variant="conversion" size="lg" arrow>
                Explore Our Work
              </SiteButton>
            </div>
          </>
        )}
      </SiteGrid>
    </SiteSection>
  )
}

function WorkCard({ item }: { item: FeaturedWork }) {
  return (
    <article className={cn(homeStyles.mediaHover, styles.workCard, 'group relative flex w-full flex-col')}>
      <div className={cn(homeStyles.media, 'aspect-[16/10]')}>
        {item.image ? (
          <SiteImage src={item.image.src} alt={item.image.alt} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 45vw, 100vw" />
        ) : (
          <div aria-hidden="true" className="flex h-full items-center justify-center">
            <HbeeModuleGlyph size={48} signal="quiet" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        {item.industry && (
          <p className="text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-fg-muted">
            {item.industry}
          </p>
        )}
        <h3 className="mt-2 font-hb-display text-[1.25rem] font-bold leading-snug tracking-[-0.015em] text-hb-fg">
          <Link href={caseStudyHref(item.slug)} className="after:absolute after:inset-0 after:content-['']">
            {item.client}
          </Link>
        </h3>
        {item.title && <p className="mt-1 font-medium text-hb-fg">{item.title}</p>}
        {item.context && <p className="mt-3 text-[0.9375rem] leading-relaxed text-hb-fg-body">{item.context}</p>}

        {item.services.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Project tags">
            {item.services.map((s) => (
              <li key={s}>
                <SiteTag>{s}</SiteTag>
              </li>
            ))}
          </ul>
        )}

        <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1.5 pt-5 font-semibold text-hb-link group-hover:underline">
          View project <SiteArrow size={16} className="transition-transform duration-[var(--hb-dur-base)] group-hover:translate-x-[3px]" />
        </span>
      </div>
    </article>
  )
}
