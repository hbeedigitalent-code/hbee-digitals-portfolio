import Link from 'next/link'
import { cn } from '@/lib/cn'
import { groupMedia, MEDIA_GROUP_TITLES, type MediaGroupKind } from '@/lib/site/work-classification'
import type { WorkDetail, WorkImage, WorkItem } from '@/lib/site/work-data'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteArrow } from '../primitives/SiteIcons'
import { SiteSection } from '../primitives/SiteSection'
import { SiteEyebrow } from '../primitives/SiteTypography'
import { CaseStudyContextStrip, EvidenceImage, WorkApproach, WorkDetailHero, WorkNarrative, WorkOutcome, WorkVideos } from './WorkDetail'
import { Media, WorkCard, WorkCta } from './WorkSections'
import homeStyles from '../home/home.module.css'
import styles from './work.module.css'

/* ── /case-studies listing ─────────────────────────────────────────────
   Only projects deliberately marked as Case Studies. The first is featured as
   a full-width editorial block (so a single Case Study never sits in a sparse
   grid); further ones follow in a two-column grid, and a lone remaining one
   is featured the same way. Everything comes from the CMS. */

export function CaseStudiesHero() {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="case-studies-title" className="overflow-hidden">
      <div aria-hidden="true" className={homeStyles.heroField}>
        <svg className={homeStyles.heroGrid} viewBox="0 0 600 500" preserveAspectRatio="none" focusable="false">
          <g stroke="var(--hb-structure)" strokeOpacity="0.08" strokeWidth="1">
            <path d="M0 125H600M0 250H600M0 375H600" />
            <path d="M150 0V500M300 0V500M450 0V500" />
          </g>
        </svg>
      </div>
      <div className={styles.csHero}>
        <SiteEyebrow signal>Case studies</SiteEyebrow>
        <h1 id="case-studies-title" className="mt-6 max-w-[16ch] font-hb-display text-[clamp(2.5rem,1.7rem+2.5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg">
          The work, in depth.
        </h1>
        <p className="mt-6 max-w-[40rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">
          Selected projects, told with the context, the work and what it connects to. For the wider range of what Hbee makes, browse all work.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <SiteButton href="#case-study-collection" variant="conversion" size="lg" arrow>
            Explore case studies
          </SiteButton>
          <SiteButton href="/work" variant="secondary" size="lg">
            Explore all work
          </SiteButton>
        </div>
      </div>
    </SiteSection>
  )
}

function CaseStudyCard({ item, lead, reverse, label }: { item: WorkItem; lead?: boolean; reverse?: boolean; label?: string }) {
  const caps = item.creative?.capabilities.slice(0, 3).map((c) => c.name).join(' · ')
  const meta = [item.category, item.projectType].filter(Boolean).join(' · ')
  return (
    <article className={cn(styles.csCard, lead && styles.csCardLead, lead && reverse && styles.csCardReverse, 'group')}>
      <Media
        item={item}
        caseStudyBadge={false}
        sizes={lead ? '(min-width: 1024px) 55vw, 100vw' : '(min-width: 768px) 45vw, 100vw'}
        priority={lead}
        className={styles.csMedia}
      />
      <div className={styles.csBody}>
        {label && <p className={styles.featuredLabel}>{label}</p>}
        {meta && <p className={styles.csMeta}>{meta}</p>}
        <h2 className="font-hb-display text-[clamp(1.375rem,1.15rem+0.8vw,1.875rem)] font-bold leading-[1.12] tracking-[-0.025em] text-hb-fg">
          <Link href={item.href} className="after:absolute after:inset-0 after:content-['']">
            {item.title ?? item.client}
          </Link>
        </h2>
        {item.title && <p className="mt-1.5 font-medium text-hb-ink">{item.client}</p>}
        {item.description && <p className={cn('mt-3 max-w-[38rem] leading-relaxed text-hb-fg-body', !lead && 'line-clamp-4')}>{item.description}</p>}
        {caps && (
          <p className={styles.capabilityLine}>
            <span className="sr-only">Capabilities: </span>
            {caps}
          </p>
        )}
        <span aria-hidden="true" className="mt-auto inline-flex items-center gap-1.5 pt-6 font-semibold text-hb-link group-hover:underline">
          Read case study <SiteArrow size={16} className="transition-transform duration-[var(--hb-dur-base)] group-hover:translate-x-[3px]" />
        </span>
        <span className="sr-only">: {item.client}</span>
      </div>
    </article>
  )
}

export function CaseStudiesCollection({ items }: { items: WorkItem[] }) {
  // Featured treatment: the first Case Study, and a sole remaining one, so no row is ever left half-empty.
  const wide = (i: number) => i === 0 || (items.length === 2 && i === 1)
  return (
    <SiteSection id="case-study-collection" tone="cloud" spacing="compact" aria-labelledby="case-study-collection-title" className={cn(styles.anchor, styles.collection)}>
      <h2 id="case-study-collection-title" className="sr-only">
        Case studies
      </h2>
      {items.length === 0 ? (
        <SiteReveal className={styles.empty}>
          <span aria-hidden="true" className={styles.emptyGlyph}>
            <HbeeModuleGlyph size={40} signal="quiet" />
          </span>
          <div>
            <p className="font-hb-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em] text-hb-fg">Case studies are on their way.</p>
            <p className="mt-2 max-w-[38rem] leading-relaxed text-hb-fg-body">Selected projects will appear here once they are ready to be told in depth. Meanwhile, browse the wider work.</p>
          </div>
          <SiteButton href="/work" variant="secondary" arrow className="md:ml-auto">
            Explore all work
          </SiteButton>
        </SiteReveal>
      ) : (
        <>
          <ul className={styles.csGrid}>
            {items.map((item, i) => (
              <li key={item.id} className={cn('flex', wide(i) && styles.csLead)}>
                <SiteReveal index={wide(i) ? 0 : i % 2} className="flex w-full">
                  <CaseStudyCard item={item} lead={wide(i)} reverse={i % 2 === 1} label={i === 0 ? 'Featured case study' : undefined} />
                </SiteReveal>
              </li>
            ))}
          </ul>
          <SiteReveal className={styles.csMore}>
            <p>Case studies are added as projects are ready to be told in depth. The wider library shows the full range of work.</p>
            <SiteButton href="/work#work-collection" variant="secondary" arrow>
              Explore all work
            </SiteButton>
          </SiteReveal>
        </>
      )}
    </SiteSection>
  )
}

/* ── /case-studies/[slug] ───────────────────────────────────────────── */

const GROUP_NOTE: Partial<Record<MediaGroupKind, string>> = {
  mockup: 'Mockups show how the work is presented. They are not performance results.',
}

/** Wide lead frame + paired frames, or a three-up identity grid, depending on the group and count. */
function MediaGroup({ kind, items, showTitle }: { kind: MediaGroupKind; items: WorkImage[]; showTitle: boolean }) {
  const lead = kind === 'web' || kind === 'mockup' || items.length === 1
  const layout = kind === 'identity' && items.length >= 3 ? styles.csTrio : styles.csPair
  const [first, ...rest] = items
  return (
    <div className={styles.csGroup}>
      {showTitle && <h3 className={styles.csGroupTitle}>{MEDIA_GROUP_TITLES[kind]}</h3>}
      {GROUP_NOTE[kind] && <p className={styles.csGroupNote}>{GROUP_NOTE[kind]}</p>}
      {lead ? (
        <>
          <div className={styles.csWide}>
            <EvidenceImage image={first} labelled />
          </div>
          {rest.length > 0 && (
            <div className={cn(styles.csPair, 'mt-[var(--hb-grid-gap)]')}>
              {rest.map((image) => <EvidenceImage key={image.src} image={image} labelled />)}
            </div>
          )}
        </>
      ) : (
        <div className={layout}>
          {items.map((image, index) => (
            <div key={image.src} className={cn(items.length % 2 === 1 && layout === styles.csPair && index === 0 && styles.csWide)}>
              <EvidenceImage image={image} labelled />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Stills sequenced by asset type; the editor's display order decides group order. Renders nothing without media. */
export function CaseStudyMedia({ detail }: { detail: WorkDetail }) {
  const stills = detail.gallery
  const { beforeAfter } = detail
  if (!stills.length && !beforeAfter) return null
  const groups = groupMedia(stills)
  const onlyGeneric = groups.length === 1 && groups[0].kind === 'other'
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="case-media" className={styles.caseBand}>
      <SiteReveal>
        <SiteEyebrow signal>The work in detail</SiteEyebrow>
        <h2 id="case-media" className="mt-5 font-hb-display text-[length:var(--hb-text-h2)] font-bold leading-[1.07] tracking-[-0.03em] text-hb-fg">
          A closer look.
        </h2>
      </SiteReveal>
      {beforeAfter && (
        <SiteReveal index={1} className={styles.csGroup}>
          <h3 className={styles.csGroupTitle}>Before and after</h3>
          <div className={styles.csPair}>
            <EvidenceImage image={beforeAfter[0]} framed />
            <EvidenceImage image={beforeAfter[1]} framed />
          </div>
        </SiteReveal>
      )}
      {groups.map((group, i) => (
        <SiteReveal key={group.kind} index={Math.min(i + 1, 3)}>
          <MediaGroup kind={group.kind} items={group.items} showTitle={!onlyGeneric} />
        </SiteReveal>
      ))}
    </SiteSection>
  )
}

/** Steps from the legacy process field. Renders nothing when there are none. */
function CaseStudyProcess({ detail }: { detail: WorkDetail }) {
  const steps = detail.creative?.process ?? []
  if (!steps.length) return null
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="case-process" className={styles.caseBand}>
      <SiteReveal>
        <SiteEyebrow signal>Process</SiteEyebrow>
        <h2 id="case-process" className="mt-5 font-hb-display text-[length:var(--hb-text-h3)] font-bold leading-tight tracking-[-0.02em] text-hb-fg">
          How the work moved.
        </h2>
      </SiteReveal>
      <ol className={styles.processList}>
        {steps.map((step, i) => (
          <li key={`${i}-${step.title}`} className={styles.processStep}>
            <span aria-hidden="true" className={styles.processNumber}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3 className={styles.assetTitle}>{step.title}</h3>
              {step.text && <p className={styles.processText}>{step.text}</p>}
            </div>
          </li>
        ))}
      </ol>
    </SiteSection>
  )
}

/** Legacy testimonial field, client engagements only. No attribution is invented. */
function CaseStudyTestimonial({ detail }: { detail: WorkDetail }) {
  const t = detail.creative?.testimonial
  if (!t) return null
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="case-feedback" className={styles.caseBand}>
      <SiteReveal>
        <SiteEyebrow signal>Client feedback</SiteEyebrow>
        <h2 id="case-feedback" className="sr-only">Client feedback</h2>
        <figure className={styles.quote}>
          <blockquote>{t.quote}</blockquote>
          {(t.author || t.role) && <figcaption>{[t.author, t.role].filter(Boolean).join(', ')}</figcaption>}
        </figure>
      </SiteReveal>
    </SiteSection>
  )
}

/** Closing navigation when there are no related projects to show. */
function CaseStudyBack() {
  return (
    <SiteSection tone="cloud" spacing="compact" aria-label="More work" className={styles.caseBand}>
      <SiteReveal className={styles.nextProject}>
        <p className="font-hb-display text-[length:var(--hb-text-h3)] font-bold leading-tight tracking-[-0.02em] text-hb-fg">More from Hbee</p>
        <div className="flex flex-wrap items-center gap-3">
          <SiteButton href="/case-studies" variant="secondary" arrow>
            Back to all case studies
          </SiteButton>
          <SiteButton href="/work#work-collection" variant="secondary">
            Explore all work
          </SiteButton>
        </div>
      </SiteReveal>
    </SiteSection>
  )
}

function RelatedWork({ items }: { items: WorkItem[] }) {
  if (!items.length) return null
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="case-related" className={styles.caseBand}>
      <SiteReveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SiteEyebrow signal>More work</SiteEyebrow>
          <h2 id="case-related" className="mt-5 font-hb-display text-[length:var(--hb-text-h3)] font-bold leading-tight tracking-[-0.02em] text-hb-fg">
            Related projects
          </h2>
        </div>
        <SiteButton href="/work#work-collection" variant="secondary" arrow>
          Explore all work
        </SiteButton>
      </SiteReveal>
      <ul className={styles.grid}>
        {items.map((item) => (
          <li key={item.id} className="flex">
            <WorkCard item={item} />
          </li>
        ))}
      </ul>
    </SiteSection>
  )
}

/**
 * Case Study template. One modular system: every module renders only when the
 * project's own data supports it, nothing is invented (there is no objectives,
 * role, process or testimonial field yet, so those modules do not exist here).
 * Ongoing projects never claim final results; studio projects never read as a
 * client relationship (see work-classification / WorkDetail).
 */
export function CaseStudyPage({ detail, related = [] }: { detail: WorkDetail; related?: WorkItem[] }) {
  return (
    <>
      <WorkDetailHero detail={detail} />
      <CaseStudyContextStrip detail={detail} />
      <WorkNarrative detail={detail} />
      <WorkApproach detail={detail} glance={false} />
      <CaseStudyProcess detail={detail} />
      <CaseStudyMedia detail={detail} />
      <WorkVideos detail={detail} />
      <WorkOutcome detail={detail} />
      <CaseStudyTestimonial detail={detail} />
      <RelatedWork items={related} />
      {!related.length && <CaseStudyBack />}
      <WorkCta eyebrow="Start your own project" heading="Planning something like this?" />
    </>
  )
}
