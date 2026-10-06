import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { WorkDetail, WorkImage } from '@/lib/site/work-data'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteImage } from '../primitives/SiteImage'
import { SiteArrow } from '../primitives/SiteIcons'
import { SiteSection } from '../primitives/SiteSection'
import { SiteEyebrow } from '../primitives/SiteTypography'
import { WorkCta } from './WorkSections'
import styles from './work.module.css'

/**
 * Case study template. Every section renders only when the project's real
 * data supports it, so a rich, medium or lean project all read as complete:
 *
 *   Hero (always) · Context / Constraint · Approach + At a glance (always) ·
 *   Evidence · Outcome · CTA (always)
 *
 * No headings without content, no filler values, no capability chips,
 * roles, periods or metrics (the data holds none verifiably).
 */
export function WorkDetailPage({ detail }: { detail: WorkDetail }) {
  return (
    <>
      <WorkDetailHero detail={detail} />
      <WorkNarrative detail={detail} />
      <WorkApproach detail={detail} />
      <WorkEvidence detail={detail} />
      <WorkOutcome detail={detail} />
      <WorkCta />
    </>
  )
}

function MetaLine({ detail }: { detail: WorkDetail }) {
  const parts = [detail.category, detail.projectType].filter(Boolean) as string[]
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

function LiveSiteLink({ detail, variant }: { detail: WorkDetail; variant: 'button' | 'inline' }) {
  if (!detail.liveUrl) return null
  const label = (
    <>
      Visit live site<span className="sr-only"> for {detail.client} (opens in a new tab)</span>
    </>
  )
  if (variant === 'button')
    return (
      <a href={detail.liveUrl} target="_blank" rel="noopener noreferrer" className={styles.liveButton}>
        {label}
        <SiteArrow size={16} className="-rotate-45" />
      </a>
    )
  return (
    <a href={detail.liveUrl} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
      {detail.liveUrl.replace(/^https:\/\//, '').replace(/\/$/, '')}
      <span className="sr-only"> (opens in a new tab)</span>
      <SiteArrow size={14} className="-rotate-45" />
    </a>
  )
}

/* ── 01 — Hero: project text left, real project image right ── */

function WorkDetailHero({ detail }: { detail: WorkDetail }) {
  const image = detail.heroImage
  return (
    <SiteSection tone="cloud" spacing="none" contained={false} aria-labelledby="case-title" className="overflow-hidden">
      <div className={cn(styles.caseHero, !image && styles.caseHeroTextOnly)}>
        <div className={styles.caseHeroText}>
          <Link href="/rebuild-work" className={styles.backLink}>
            <SiteArrow size={15} className="rotate-180" />
            Back to all work
          </Link>
          <div className="mt-6">
            <MetaLine detail={detail} />
          </div>
          {detail.hasTitle && <p className="mt-4 font-semibold text-hb-ink">{detail.client}</p>}
          <h1
            id="case-title"
            className={cn(
              'font-hb-display text-[clamp(2.25rem,1.6rem+2.2vw,3.4rem)] font-bold leading-[1.04] tracking-[-0.035em] text-hb-fg',
              detail.hasTitle ? 'mt-2' : 'mt-4',
            )}
          >
            {detail.headline}
          </h1>
          {detail.summary && <p className="mt-6 max-w-[36rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">{detail.summary}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <LiveSiteLink detail={detail} variant="button" />
            <SiteButton href="/rebuild-work#work-collection" variant="secondary" size="lg">
              View More Work
            </SiteButton>
          </div>
        </div>
        {image && (
          <SiteReveal motion="focus" className={styles.caseHeroMedia}>
            <SiteImage src={image.src} alt={image.alt} sizes="(min-width: 1024px) 52vw, 100vw" priority className={styles.mediaImage} />
          </SiteReveal>
        )}
      </div>
    </SiteSection>
  )
}

/* ── 02/03 — Context + Constraint (each only when stored) ── */

function WorkNarrative({ detail }: { detail: WorkDetail }) {
  const blocks = [
    detail.context && { id: 'context', eyebrow: 'The context', text: detail.context },
    detail.constraint && { id: 'constraint', eyebrow: 'The challenge', text: detail.constraint },
  ].filter(Boolean) as { id: string; eyebrow: string; text: string }[]
  if (!blocks.length) return null
  return (
    <SiteSection tone="cloud" spacing="compact" aria-label="Project background" className={styles.caseBand}>
      <div className={cn(styles.narrative, blocks.length === 1 && styles.narrativeSingle)}>
        {blocks.map((b, i) => (
          <SiteReveal key={b.id} index={i} className={styles.narrativeBlock}>
            <SiteEyebrow signal as="p">
              {b.eyebrow}
            </SiteEyebrow>
            <h2 className="sr-only">{b.eyebrow}</h2>
            <p className="mt-5 max-w-[38rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{b.text}</p>
          </SiteReveal>
        ))}
      </div>
    </SiteSection>
  )
}

/* ── 04/05 — Approach (only when stored) + Project at a glance (always) ── */

function WorkApproach({ detail }: { detail: WorkDetail }) {
  const rows = [
    ['Client', detail.client],
    ['Category', detail.category],
    ['Industry', detail.industry],
    ['Project type', detail.projectType],
  ].filter(([, v]) => v) as [string, string][]
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby={detail.approach ? 'case-approach' : 'case-glance'}>
      <div className={cn(styles.approachGrid, !detail.approach && styles.approachGridGlanceOnly)}>
        {detail.approach && (
          <SiteReveal>
            <SiteEyebrow signal>The work</SiteEyebrow>
            <h2 id="case-approach" className="mt-5 font-hb-display text-[length:var(--hb-text-h3)] font-bold leading-tight tracking-[-0.02em] text-hb-fg">
              What was delivered
            </h2>
            <p className="mt-4 max-w-[40rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{detail.approach}</p>
          </SiteReveal>
        )}
        <SiteReveal index={1}>
          <aside className={styles.glance} aria-labelledby="case-glance">
            <h2 id="case-glance" className={styles.glanceTitle}>
              <HbeeModuleGlyph size={18} signal="quiet" />
              Project at a glance
            </h2>
            <dl className={styles.glanceList}>
              {rows.map(([k, v]) => (
                <div key={k} className={styles.glanceRow}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              {detail.liveUrl && (
                <div className={styles.glanceRow}>
                  <dt>Live site</dt>
                  <dd>
                    <LiveSiteLink detail={detail} variant="inline" />
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </SiteReveal>
      </div>
    </SiteSection>
  )
}

/* ── 06 — Evidence: real media beyond the hero image (before/after first) ── */

function EvidenceImage({ image, wide }: { image: WorkImage; wide?: boolean }) {
  return (
    <figure className={cn(styles.evidenceItem, wide && styles.evidenceWide)}>
      <div className={styles.media}>
        <span aria-hidden="true" className={styles.mediaFallback}>
          <HbeeModuleGlyph size={40} signal="quiet" />
        </span>
        <SiteImage src={image.src} alt={image.alt} sizes={wide ? '(min-width: 1024px) 80vw, 100vw' : '(min-width: 1024px) 40vw, 100vw'} className={styles.mediaImage} />
      </div>
      {image.label && <figcaption className={styles.evidenceLabel}>{image.label}</figcaption>}
    </figure>
  )
}

function WorkEvidence({ detail }: { detail: WorkDetail }) {
  const { gallery, beforeAfter } = detail
  if (!gallery.length && !beforeAfter) return null
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="case-evidence" className={styles.caseBand}>
      <SiteReveal>
        <SiteEyebrow signal>Evidence</SiteEyebrow>
        <h2 id="case-evidence" className="mt-5 font-hb-display text-[length:var(--hb-text-h2)] font-bold leading-[1.07] tracking-[-0.03em] text-hb-fg">
          A closer look at the work.
        </h2>
      </SiteReveal>
      {beforeAfter && (
        <SiteReveal index={1} className={cn(styles.evidenceGrid, 'mt-10')}>
          <EvidenceImage image={beforeAfter[0]} />
          <EvidenceImage image={beforeAfter[1]} />
        </SiteReveal>
      )}
      {gallery.length > 0 && (
        <SiteReveal index={2} className={cn(styles.evidenceGrid, 'mt-10', gallery.length === 1 && styles.evidenceGridSingle)}>
          {gallery.map((image, i) => (
            <EvidenceImage key={image.src} image={image} wide={gallery.length === 1 || (gallery.length % 2 === 1 && i === 0)} />
          ))}
        </SiteReveal>
      )}
    </SiteSection>
  )
}

/* ── 07 — Outcome: stored qualitative text only (no figures) ── */

function WorkOutcome({ detail }: { detail: WorkDetail }) {
  if (!detail.outcome) return null
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="case-outcome">
      <SiteReveal className={styles.outcome}>
        <SiteEyebrow signal>Outcome</SiteEyebrow>
        <h2 id="case-outcome" className="sr-only">
          Outcome
        </h2>
        <p className="mt-5 max-w-[46rem] font-hb-display text-[clamp(1.25rem,1.1rem+0.6vw,1.625rem)] font-semibold leading-snug tracking-[-0.015em] text-hb-fg">
          {detail.outcome}
        </p>
      </SiteReveal>
    </SiteSection>
  )
}
