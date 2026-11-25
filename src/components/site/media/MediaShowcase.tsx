import Link from 'next/link'
import type { CSSProperties } from 'react'
import { frameRatio, type ShowcaseItem } from '@/lib/site/showcase-model'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteSection, type SiteTone } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { ContentVideo } from './ContentVideo'
import styles from './media-showcase.module.css'

export interface MediaShowcaseProps {
  items: ShowcaseItem[]
  /** Unique on the page; names the section. */
  id: string
  eyebrow: string
  heading: string
  lede?: string
  tone?: SiteTone
}

/**
 * A mixed showcase of placed images and videos: one consistent outer module per piece, with the media keeping its own
 * proportions inside it (contained, never stretched or cropped). A plain responsive grid, not masonry, with every frame's
 * size reserved up front. Videos load nothing until played. Renders NOTHING when there are no switched-on placements.
 */
export function MediaShowcase({ items, id, eyebrow, heading, lede, tone = 'white' }: MediaShowcaseProps) {
  if (!items.length) return null
  const columns = Math.min(items.length, 3)
  return (
    <SiteSection tone={tone} spacing="compact" aria-labelledby={`${id}-title`}>
      <SiteReveal motion="none">
        <SiteEyebrow motionIndex={0}>{eyebrow}</SiteEyebrow>
        <SiteDisplayHeading id={`${id}-title`} size="h2" className="mt-6 max-w-[40rem]">{heading}</SiteDisplayHeading>
        {lede && <SiteLede className="mt-5">{lede}</SiteLede>}
      </SiteReveal>
      <ul className={styles.grid} data-columns={columns}>
        {items.map((item, index) => (
          <SiteReveal as="li" key={item.id} motion="card" index={index % 3}>
            <article className={styles.card}>
              <div className={styles.frame} style={{ '--ratio': frameRatio(item) } as CSSProperties}>
                {item.kind === 'video'
                  ? <ContentVideo src={item.url} mimeType={item.mimeType as 'video/mp4' | 'video/webm'} title={item.title || item.label} poster={item.posterUrl} captionsUrl={item.captionsUrl} preload="none" className={styles.video} />
                  : <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.open}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.alt} loading="lazy" decoding="async" width={item.width ?? undefined} height={item.height ?? undefined} className={styles.image} />
                      <span className="sr-only"> (opens the full image in a new tab)</span>
                    </a>}
              </div>
              <div className={styles.body}>
                <p className={styles.label}>{item.label}</p>
                {item.title && <h3 className={styles.title}>{item.title}</h3>}
                {item.caption && <p className={styles.caption}>{item.caption}</p>}
                {/* Under the card, closed until asked for. Rendered as text, never as markup. */}
                {item.kind === 'video' && item.transcript && <details className={styles.transcript}>
                  <summary>Transcript<span className="sr-only">: {item.title || item.label}</span></summary>
                  <p>{item.transcript}</p>
                </details>}
                {item.project && <p className={styles.project}><Link href={item.project.href}>View project: {item.project.name}</Link></p>}
              </div>
            </article>
          </SiteReveal>
        ))}
      </ul>
    </SiteSection>
  )
}
