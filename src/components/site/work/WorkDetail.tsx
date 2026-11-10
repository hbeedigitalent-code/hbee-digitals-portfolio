import Link from 'next/link'
import { ASSET_TYPES, mediaPresentation } from '@/lib/portfolio-creative'
import { cn } from '@/lib/cn'
import { engagementLabel, statusLabel } from '@/lib/site/work-classification'
import type { WorkDetail, WorkImage, WorkItem, WorkVideo } from '@/lib/site/work-data'
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
 * No headings without content, no filler values, roles, periods or metrics
 * (the data holds none verifiably).
 *
 * `detail.creative` is set ONLY when the creative rollout flag is on. Without it
 * every branch below renders exactly the legacy template. With it the same
 * template gains optional modules (engagement context, capabilities, video,
 * platforms, next project), each rendered only when its data exists:
 *   - client wording appears only for engagement_type === 'client';
 *   - an ongoing project never claims final results ("Progress so far").
 */
export function WorkDetailPage({ detail, next }: { detail: WorkDetail; next?: WorkItem | null }) {
  return (
    <>
      <WorkDetailHero detail={detail} />
      <WorkNarrative detail={detail} />
      <WorkApproach detail={detail} />
      <WorkVideos detail={detail} />
      <WorkEvidence detail={detail} />
      <WorkOutcome detail={detail} />
      {detail.creative && next && <WorkNextProject next={next} />}
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

/** Engagement context + status, creative mode only. */
export function ContextTags({ detail }: { detail: WorkDetail }) {
  const c = detail.creative
  if (!c) return null
  return (
    <p className={styles.tags}>
      {c.caseStudy && <span className={cn(styles.tag, styles.tagCaseStudy)}>Case study</span>}
      <span className={cn(styles.tag, c.engagement === 'client' && styles.tagClient)}>{engagementLabel(c.engagement)}</span>
      <span className={cn(styles.tag, c.status === 'ongoing' && styles.tagOngoing)}>{statusLabel(c.status)}</span>
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

export function WorkDetailHero({ detail }: { detail: WorkDetail }) {
  const image = detail.heroImage
  return (
    <SiteSection tone="cloud" spacing="none" contained={false} aria-labelledby="case-title" className="overflow-hidden">
      <div className={cn(styles.caseHero, !image && styles.caseHeroTextOnly)}>
        <div className={styles.caseHeroText}>
          <Link href={detail.creative?.caseStudy ? '/case-studies' : '/work'} className={styles.backLink}>
            <SiteArrow size={15} className="rotate-180" />
            {detail.creative?.caseStudy ? 'Back to all case studies' : 'Back to all work'}
          </Link>
          <div className="mt-6">
            <MetaLine detail={detail} />
            <ContextTags detail={detail} />
          </div>
          {detail.hasTitle && (!detail.creative || detail.creative.engagement === 'client') && <p className="mt-4 font-semibold text-hb-ink">{detail.client}</p>}
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
            <SiteButton href="/work#work-collection" variant="secondary" size="lg">
              View More Work
            </SiteButton>
          </div>
        </div>
        {image?.creative ? <SiteReveal motion="focus"><EvidenceImage image={image} /></SiteReveal> : image && (
          <SiteReveal motion="focus" className={styles.caseHeroMedia}>
            <SiteImage src={image.src} alt={image.alt} sizes="(min-width: 1024px) 52vw, 100vw" priority className={styles.mediaImage} />
          </SiteReveal>
        )}
      </div>
    </SiteSection>
  )
}

/* ── 02/03 — Context + Constraint (each only when stored) ── */

export function WorkNarrative({ detail }: { detail: WorkDetail }) {
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

export function WorkApproach({ detail }: { detail: WorkDetail }) {
  const c = detail.creative
  const ongoing = c?.status === 'ongoing'
  // Legacy: always "Client". Creative: that word only for a true client engagement.
  const nameRow: [string, string | undefined] = !c ? ['Client', detail.client] : c.engagement === 'client' ? ['Client', detail.client] : ['Project', detail.hasTitle ? detail.client : undefined]
  const rows = [
    nameRow,
    ['Engagement', c && engagementLabel(c.engagement)],
    ['Status', c && statusLabel(c.status)],
    ['Category', detail.category],
    ['Industry', detail.industry],
    ['Project type', detail.projectType],
    ['Services', c?.caseStudy && c.services.length ? c.services.join(', ') : undefined],
    ['Platforms & tools', c?.technologies.length ? c.technologies.join(', ') : undefined],
  ].filter(([, v]) => v) as [string, string][]
  const capabilities = c?.capabilities ?? []
  const hasMain = Boolean(detail.approach) || capabilities.length > 0
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby={detail.approach ? 'case-approach' : capabilities.length ? 'case-capabilities' : 'case-glance'}>
      <div className={cn(styles.approachGrid, !hasMain && styles.approachGridGlanceOnly)}>
        {hasMain && (
          <SiteReveal>
            {detail.approach && (
              <>
                <SiteEyebrow signal>{ongoing ? 'The work so far' : 'The work'}</SiteEyebrow>
                <h2 id="case-approach" className="mt-5 font-hb-display text-[length:var(--hb-text-h3)] font-bold leading-tight tracking-[-0.02em] text-hb-fg">
                  {ongoing ? 'What is being built' : 'What was delivered'}
                </h2>
                <p className="mt-4 max-w-[40rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{detail.approach}</p>
              </>
            )}
            {capabilities.length > 0 && (
              <div className={detail.approach ? 'mt-10' : undefined}>
                <h2 id="case-capabilities" className={styles.capabilityTitle}>
                  Where Hbee’s system was involved
                </h2>
                <ul className={styles.capabilityList}>
                  {capabilities.map((capability) => (
                    <li key={capability.slug}>
                      <Link href={capability.href} className={styles.capabilityChip}>
                        {capability.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

export function EvidenceImage({ image, wide, labelled }: { image: WorkImage; wide?: boolean; labelled?: boolean }) {
  if (image.creative) {
    const presentation = mediaPresentation(image.creative)
    const { caption, title, description, asset_type } = image.creative
    // Asset kind / title / description are creative-mode additions; legacy output is unchanged.
    const kicker = labelled && asset_type !== 'other' ? ASSET_TYPES[asset_type] : undefined
    return (
      <figure className={styles.evidenceItem}>
        <div className={cn(styles.creativeFrame, presentation.artwork && styles.creativeArtwork)} style={{ aspectRatio: presentation.ratio, maxHeight: presentation.maxHeight }}>
          <img src={image.src} alt={image.alt} loading="lazy" className={styles.creativeImage} style={{ objectFit: presentation.fit }} />
        </div>
        {(caption || (labelled && (kicker || title || description))) && (
          <figcaption className={styles.evidenceLabel}>
            {kicker && <span className={styles.assetKicker}>{kicker}</span>}
            {labelled && title && <strong className={styles.assetTitle}>{title}</strong>}
            {labelled && description && <span className={styles.assetText}>{description}</span>}
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }
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
            <EvidenceImage key={image.src} image={image} labelled={Boolean(detail.creative)} wide={gallery.length === 1 || (gallery.length % 2 === 1 && i === 0)} />
          ))}
        </SiteReveal>
      )}
    </SiteSection>
  )
}

/* ── 07 — Outcome: stored qualitative text only (no figures) ── */

export function WorkOutcome({ detail }: { detail: WorkDetail }) {
  if (!detail.outcome) return null
  // An ongoing project has no final result: its stored text is framed as progress.
  const label = detail.creative?.status === 'ongoing' ? 'Progress so far' : 'Outcome'
  return (
    <SiteSection tone="white" spacing="compact" aria-labelledby="case-outcome">
      <SiteReveal className={styles.outcome}>
        <SiteEyebrow signal>{label}</SiteEyebrow>
        <h2 id="case-outcome" className="sr-only">
          {label}
        </h2>
        <p className="mt-5 max-w-[46rem] font-hb-display text-[clamp(1.25rem,1.1rem+0.6vw,1.625rem)] font-semibold leading-snug tracking-[-0.015em] text-hb-fg">
          {detail.outcome}
        </p>
      </SiteReveal>
    </SiteSection>
  )
}

/* ── Video creative (creative mode only; each video needs its poster, title and description) ── */

function VideoItem({ video }: { video: WorkVideo }) {
  return (
    <figure className={styles.videoItem}>
      {video.playback === 'file' ? (
        // Native player: no autoplay, nothing downloads until the visitor presses play (preload none).
        <video className={styles.videoFrame} controls playsInline preload="none" poster={video.poster.src} aria-label={video.title}>
          <source src={video.videoUrl} type={video.mimeType} />
          {video.captionsUrl && <track kind="captions" src={video.captionsUrl} srcLang="en" label="Captions" />}
          <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
            Watch {video.title} (opens in a new tab)
          </a>
        </video>
      ) : (
        <div className={styles.videoFrame}>
          <div className={styles.media}>
            <SiteImage src={video.poster.src} alt={video.poster.alt} sizes="(min-width: 1024px) 50vw, 100vw" className={styles.mediaImage} />
          </div>
          <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className={styles.videoLink}>
            Watch the video<span className="sr-only">: {video.title} (opens in a new tab)</span>
            <SiteArrow size={15} className="-rotate-45" />
          </a>
        </div>
      )}
      <figcaption className={styles.videoCaption}>
        <strong className={styles.assetTitle}>{video.title}</strong>
        <span className={styles.assetText}>{video.description}</span>
        {video.caption && <span className={styles.assetText}>{video.caption}</span>}
      </figcaption>
      {video.transcript && (
        <details className={styles.transcript}>
          <summary>Transcript</summary>
          <p>{video.transcript}</p>
        </details>
      )}
    </figure>
  )
}

export function WorkVideos({ detail }: { detail: WorkDetail }) {
  const videos = detail.creative?.videos ?? []
  if (!videos.length) return null
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="case-video" className={styles.caseBand}>
      <SiteReveal>
        <SiteEyebrow signal>{videos.length === 1 ? 'Video' : 'Videos'}</SiteEyebrow>
        <h2 id="case-video" className="mt-5 font-hb-display text-[length:var(--hb-text-h2)] font-bold leading-[1.07] tracking-[-0.03em] text-hb-fg">
          Creative in motion.
        </h2>
      </SiteReveal>
      <SiteReveal index={1} className={cn(styles.videoGrid, 'mt-10', videos.length === 1 && styles.videoGridSingle)}>
        {videos.map((video) => (
          <VideoItem key={video.id} video={video} />
        ))}
      </SiteReveal>
    </SiteSection>
  )
}

/* ── Next project (creative mode only) ── */

function WorkNextProject({ next }: { next: WorkItem }) {
  return (
    <SiteSection tone="cloud" spacing="compact" aria-labelledby="case-next" className={styles.caseBand}>
      <SiteReveal className={styles.nextProject}>
        <div>
          <SiteEyebrow signal>Next project</SiteEyebrow>
          <h2 id="case-next" className="mt-4 font-hb-display text-[length:var(--hb-text-h3)] font-bold leading-tight tracking-[-0.02em] text-hb-fg">
            {next.title ?? next.client}
          </h2>
          {next.category && <p className="mt-2 text-hb-fg-body">{next.category}</p>}
        </div>
        <SiteButton href={next.href} variant="secondary" arrow>
          View the project<span className="sr-only">: {next.client}</span>
        </SiteButton>
      </SiteReveal>
    </SiteSection>
  )
}
