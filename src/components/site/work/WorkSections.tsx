import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { WorkData, WorkItem } from '@/lib/site/work-data'
import { CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteImage } from '../primitives/SiteImage'
import { SiteArrow } from '../primitives/SiteIcons'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { WorkFilter } from './WorkFilter'
import { WorkSystem } from './WorkSystem'
import homeStyles from '../home/home.module.css'
import capabilityStyles from '../capability/capability.module.css'
import styles from './work.module.css'

/* ── 01 — Hero (Cloud). Text is server-rendered and visible immediately. ── */

export function WorkHero() {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="work-hero-title" className="overflow-hidden">
      <div aria-hidden="true" className={homeStyles.heroField}>
        <svg className={homeStyles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>

      <SiteGrid className={`items-center gap-y-12 pb-[var(--hb-space-section-compact)] pt-[clamp(2.5rem,5vw,4.5rem)] lg:pt-12 ${styles.heroLayout}`}>
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            {['Work', 'Case studies'].map((word, i) => (
              <span key={word} className={i > 0 ? homeStyles.eyebrowItem : undefined}>
                {i > 0 && <span className="sr-only">, </span>}
                {word}
              </span>
            ))}
          </p>
          <h1
            id="work-hero-title"
            className="mt-6 font-hb-display text-[clamp(2.5rem,1.7rem+2.5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg"
          >
            <span className="block">Real work.</span>
            <span className="block text-hb-blue">Built around real business problems.</span>
          </h1>
          <SiteLede className="mt-6">
            Explore how Hbee helps businesses solve real challenges, improve customer experiences and build stronger
            growth systems through strategy, design, technology and creative — all connected.
          </SiteLede>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href="#work-collection" variant="conversion" size="lg" arrow>
              Explore Our Work
            </SiteButton>
            <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
              Talk to Our Team
            </SiteButton>
          </div>
        </div>
        <div className={`col-span-4 md:col-span-8 lg:col-span-6 ${styles.heroVisual}`}>
          <WorkSystem className="mx-auto max-w-[520px] lg:mr-0 lg:max-w-[580px]" />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 02–04 — Controls, featured work, supporting work (Cloud) ──
   Real portfolio_items only (getWorkData). Featured = the first project the
   CMS marks `featured`; without one there is no featured block. Cards show
   only fields the CMS holds — no metrics, roles or capability chips. */

export function WorkCollection({ data }: { data: WorkData }) {
  const { items, categories } = data
  const featured = items.find((i) => i.featured)
  const rest = items.filter((i) => i !== featured)
  const empty = items.length === 0

  return (
    <SiteSection id="work-collection" tone="cloud" spacing="compact" aria-labelledby="work-collection-title" className={cn(styles.anchor, styles.collection)}>
      <h2 id="work-collection-title" className="sr-only">
        Selected work
      </h2>

      {empty ? (
        <WorkEmptyState />
      ) : (
        <WorkFilter categories={categories} total={items.length}>
          {featured && (
            <div data-work-item="" data-view="all-only" data-category={featured.categoryKey ?? ''}>
              <WorkFeatured item={featured} />
            </div>
          )}
          <ul className={styles.grid}>
            {featured && (
              <li data-work-item="" data-view="filtered-only" data-category={featured.categoryKey ?? ''} hidden className="flex">
                <WorkCard item={featured} />
              </li>
            )}
            {rest.map((item, i) => (
              <li key={item.id} className="flex" data-work-item="" data-category={item.categoryKey ?? ''}>
                <SiteReveal index={i % 3} className="flex w-full">
                  <WorkCard item={item} />
                </SiteReveal>
              </li>
            ))}
          </ul>
        </WorkFilter>
      )}
    </SiteSection>
  )
}

function Meta({ item }: { item: WorkItem }) {
  const parts = [item.category, item.projectType].filter(Boolean)
  if (!parts.length) return null
  return (
    <p className={styles.meta}>
      <span aria-hidden="true" className={styles.metaSignal} />
      {parts.map((p, i) => (
        <span key={p}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {i > 0 && <span className="sr-only">, </span>}
          {p}
        </span>
      ))}
    </p>
  )
}

/* Media frame: the real project image over a restrained branded plane. If
   the image is missing the plane shows on its own; if it fails to load the
   image renders transparent (no alt-text or broken-icon artefact) and the
   plane remains — never a stand-in that looks like project evidence. */
function Media({ item, sizes, priority, className }: { item: WorkItem; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={cn(styles.media, className)}>
      <span aria-hidden="true" className={styles.mediaFallback}>
        <HbeeModuleGlyph size={48} signal="quiet" />
      </span>
      {item.image && <SiteImage src={item.image.src} alt={item.image.alt} sizes={sizes} priority={priority} className={styles.mediaImage} />}
    </div>
  )
}

function WorkFeatured({ item }: { item: WorkItem }) {
  return (
    <SiteReveal>
    <article className={styles.featured} aria-labelledby={`work-${item.id}`}>
      <Media item={item} sizes="(min-width: 1024px) 50vw, 100vw" priority className={styles.featuredMedia} />
      <div className={styles.featuredBody}>
        <p className={styles.featuredLabel}>Featured project</p>
        <Meta item={item} />
        <h3 id={`work-${item.id}`} className="mt-3 font-hb-display text-[clamp(1.625rem,1.3rem+1vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.03em] text-hb-fg">
          {item.client}
        </h3>
        {item.title && <p className="mt-2 text-[1.0625rem] font-medium text-hb-ink">{item.title}</p>}
        {item.description && <p className="mt-4 max-w-[36rem] leading-relaxed text-hb-fg-body">{item.description}</p>}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <SiteButton href={item.href} variant="secondary" arrow>
            View the project<span className="sr-only">: {item.client}</span>
          </SiteButton>
          {item.websiteUrl && (
            <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
              Visit live site<span className="sr-only"> for {item.client} (opens in a new tab)</span>
              <SiteArrow size={15} className="-rotate-45" />
            </a>
          )}
        </div>
      </div>
    </article>
    </SiteReveal>
  )
}

function WorkCard({ item }: { item: WorkItem }) {
  return (
    <article className={cn(homeStyles.mediaHover, styles.card, 'group')}>
      <Media item={item} sizes="(min-width: 1152px) 30vw, (min-width: 768px) 45vw, 100vw" />
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <Meta item={item} />
        <h3 className="mt-2 font-hb-display text-[1.25rem] font-bold leading-snug tracking-[-0.015em] text-hb-fg">
          <Link href={item.href} className="after:absolute after:inset-0 after:content-['']">
            {item.client}
          </Link>
        </h3>
        {item.title && <p className="mt-1 font-medium text-hb-ink">{item.title}</p>}
        {item.description && <p className="mt-3 text-[0.9375rem] leading-relaxed text-hb-fg-body">{item.description}</p>}
        <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1.5 pt-5 font-semibold text-hb-link group-hover:underline">
          View the project <SiteArrow size={16} className="transition-transform duration-[var(--hb-dur-base)] group-hover:translate-x-[3px]" />
        </span>
      </div>
    </article>
  )
}

function WorkEmptyState() {
  return (
    <SiteReveal className={styles.empty}>
      <span aria-hidden="true" className={styles.emptyGlyph}>
        <HbeeModuleGlyph size={40} signal="quiet" />
      </span>
      <div>
        <p className="font-hb-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em] text-hb-fg">Project work is on its way.</p>
        <p className="mt-2 max-w-[38rem] leading-relaxed text-hb-fg-body">
          Real project work will appear here when portfolio data is available in the isolated preview environment.
        </p>
      </div>
      <SiteButton href={CONTACT_HREF} variant="secondary" arrow className="md:ml-auto">
        Talk to Our Team
      </SiteButton>
    </SiteReveal>
  )
}

/* ── 05 — Final CTA (Night) ── */

export function WorkCta() {
  return (
    <SiteSection tone="night" aria-labelledby="work-cta-title" className="overflow-hidden">
      <div aria-hidden="true" className={capabilityStyles.ctaGeometry}>
        <HbeeModuleGlyph signal="none" className={capabilityStyles.ctaGlyph} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph2}`} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph3}`} />
      </div>
      <div className="relative max-w-[44rem]">
        <SiteReveal>
          <SiteEyebrow signal>Ready to talk about your next project</SiteEyebrow>
        </SiteReveal>
        <SiteReveal index={1}>
          <SiteDisplayHeading id="work-cta-title" size="h1" className="mt-6">
            Let’s create what’s next.
          </SiteDisplayHeading>
        </SiteReveal>
        <SiteReveal index={2}>
          <p className="mt-6 max-w-[36rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">
            Start with a focused Growth Review and explore how Hbee can help your business solve real challenges and
            achieve what comes next.
          </p>
        </SiteReveal>
        <SiteReveal index={3} className="mt-9 flex flex-wrap items-center gap-3">
          <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
            Start Growth Review
          </SiteButton>
          <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
            Talk to Our Team
          </SiteButton>
        </SiteReveal>
      </div>
    </SiteSection>
  )
}
