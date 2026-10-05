import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { FeaturedWork } from '@/lib/site/home-data'
import { ALL_WORK_HREF, caseStudyHref } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteLinkArrow } from '../primitives/SiteButton'
import { SiteTag } from '../primitives/SiteCard'
import { SiteImage } from '../primitives/SiteImage'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { SiteArrow } from '../primitives/SiteIcons'
import styles from './home.module.css'

/**
 * 08 — Selected work, from real portfolio_items rows (getFeaturedWork).
 * Image-first. Every field is optional: what the CMS doesn't hold is left
 * out — no placeholder metrics, no stock imagery standing in for a project.
 */
export function HomeSelectedWork({ work }: { work: FeaturedWork[] }) {
  // Empty state: no usable projects → keep the heading and one honest line,
  // collapse the section to compact spacing, render no media or placeholders.
  const empty = work.length === 0
  return (
    <SiteSection tone="cloud" spacing={empty ? 'compact' : 'default'} aria-labelledby="home-work-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <SiteReveal>
            <SiteEyebrow>Selected work</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-work-title" size="h2" className="mt-6">
              Built around real businesses.
            </SiteDisplayHeading>
          </SiteReveal>
          {empty && (
            <p className="mt-4 max-w-[36rem] text-hb-fg-body">Featured case studies will appear here once projects are published.</p>
          )}
        </div>
        <SiteLinkArrow href={ALL_WORK_HREF}>View all work</SiteLinkArrow>
      </div>

      {empty ? null : (
        <ul
          className={cn(
            'mt-12 grid gap-x-[var(--hb-grid-gap)] gap-y-12',
            work.length === 1 && 'lg:grid-cols-1',
            work.length === 2 && 'md:grid-cols-2',
            work.length >= 3 && 'md:grid-cols-2 lg:grid-cols-12',
          )}
        >
          {work.map((item, i) => {
            const lead = work.length >= 3 && i === 0
            return (
              <SiteReveal
                as="li"
                key={item.id}
                index={i}
                className={cn(
                  work.length >= 3 && (lead ? 'md:col-span-2 lg:col-span-7 lg:row-span-2' : 'lg:col-span-5'),
                )}
              >
                <WorkCard item={item} lead={lead} />
              </SiteReveal>
            )
          })}
        </ul>
      )}
    </SiteSection>
  )
}

function WorkCard({ item, lead }: { item: FeaturedWork; lead: boolean }) {
  return (
    <article className={cn(styles.mediaHover, 'group relative flex h-full flex-col')}>
      <div className={cn(styles.media, lead ? 'aspect-[16/11]' : 'aspect-[16/10]')}>
        {item.image ? (
          <SiteImage
            src={item.image.src}
            alt={item.image.alt}
            sizes={lead ? '(min-width: 1024px) 58vw, 100vw' : '(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw'}
          />
        ) : (
          <div aria-hidden="true" className="flex h-full items-center justify-center">
            <HbeeModuleGlyph size={56} signal="quiet" />
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        {item.industry && (
          <p className="text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-fg-muted">
            {item.industry}
          </p>
        )}
        <h3
          className={cn(
            'mt-2 font-hb-display font-bold tracking-[-0.02em] text-hb-fg',
            lead ? 'text-[length:var(--hb-text-h3)] lg:text-[2rem]' : 'text-[length:var(--hb-text-h3)]',
          )}
        >
          <Link href={caseStudyHref(item.slug)} className="after:absolute after:inset-0 after:content-['']">
            {item.client}
          </Link>
        </h3>
        {item.title && <p className="mt-1 font-medium text-hb-ink">{item.title}</p>}
        {item.context && <p className="mt-3 max-w-[36rem] leading-relaxed text-hb-fg-body">{item.context}</p>}

        {item.result && (
          <p className="mt-4 flex items-baseline gap-2">
            <span className="font-hb-display text-[1.75rem] font-bold tracking-[-0.02em] text-hb-blue">{item.result.value}</span>
            <span className="text-[0.875rem] text-hb-fg-body">{item.result.label}</span>
          </p>
        )}

        {item.services.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Services">
            {item.services.map((s) => (
              <li key={s}>
                <SiteTag>{s}</SiteTag>
              </li>
            ))}
          </ul>
        )}

        <span aria-hidden="true" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-hb-link group-hover:underline">
          View case study <SiteArrow size={16} className="transition-transform duration-[var(--hb-dur-base)] group-hover:translate-x-[3px]" />
        </span>
      </div>
    </article>
  )
}
