import Link from 'next/link'
import { InsightArticleBody } from './InsightArticleBody'
import { cn } from '@/lib/cn'
import type { InsightDetail } from '@/lib/site/insights-data'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteImage } from '../primitives/SiteImage'
import { SiteArrow } from '../primitives/SiteIcons'
import { SiteSection } from '../primitives/SiteSection'
import { InsightCard, InsightMeta, InsightsCta, TopicLabel } from './InsightsSections'
import styles from './insights.module.css'

/**
 * Article template. Everything comes from the stored post:
 *   hero (topic, title, excerpt, date / author / read time when stored, image)
 *   body (existing sanitizer → heading ids), TOC only with ≥ 3 real headings,
 *   related only when other posts share a real topic, then the CTA.
 * No callouts are manufactured; no metadata is filled in.
 */
export function InsightDetailPage({ detail }: { detail: InsightDetail }) {
  const hasToc = detail.toc.length > 0
  const hasRelated = detail.related.length > 0
  return (
    <>
      <InsightHero detail={detail} />
      {(detail.html || hasRelated) && (
        <SiteSection tone="white" spacing="compact" aria-label="Article" className={styles.articleBand}>
          <div className={cn(styles.articleGrid, hasToc && styles.articleGridToc, hasRelated && styles.articleGridRelated, !hasToc && !hasRelated && styles.articleGridLean)}>
            {hasToc && <ArticleToc detail={detail} />}
            {detail.html ? (
              <InsightArticleBody html={detail.html} />
            ) : null}
            {hasRelated && <RelatedInsights detail={detail} />}
          </div>
        </SiteSection>
      )}
      <InsightsCta
        eyebrow="Ready to apply what you’ve learned"
        headline="Find what should move next."
        copy="Start with a focused Growth Review and get a clearer view of what deserves attention first in your business."
      />
    </>
  )
}

function InsightHero({ detail }: { detail: InsightDetail }) {
  const image = detail.image
  return (
    <SiteSection tone="cloud" spacing="none" contained={false} aria-labelledby="insight-title" className="overflow-hidden">
      <div className={cn(styles.articleHero, !image && styles.articleHeroTextOnly)}>
        <div className={styles.articleHeroText}>
          <Link href="/insights" className={styles.backLink}>
            <SiteArrow size={15} className="rotate-180" />
            Back to Insights
          </Link>
          <div className="mt-5">
            <TopicLabel topic={detail.topic} />
          </div>
          <h1 id="insight-title" className="mt-3 font-hb-display text-[clamp(2.125rem,1.6rem+1.9vw,3.25rem)] font-bold leading-[1.06] tracking-[-0.035em] text-hb-fg">
            {detail.title}
          </h1>
          {detail.excerpt && <p className="mt-5 max-w-[38rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">{detail.excerpt}</p>}
          <InsightMeta item={detail} className="mt-6" />
        </div>
        {image && (
          <SiteReveal motion="focus" className={styles.articleHeroMedia}>
            <SiteImage src={image.src} alt={image.alt} sizes="(min-width: 1024px) 48vw, 100vw" priority className={styles.mediaImage} />
          </SiteReveal>
        )}
      </div>
    </SiteSection>
  )
}

/* One reading-navigation treatment, generated from the rendered H2/H3s. */
function ArticleToc({ detail }: { detail: InsightDetail }) {
  return (
    <nav aria-labelledby="insight-toc" className={styles.toc}>
      <p id="insight-toc" className={styles.tocTitle}>
        In this article
      </p>
      <ol className={styles.tocList}>
        {detail.toc.map((h) => (
          <li key={h.id} className={h.level === 3 ? styles.tocSub : undefined}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function RelatedInsights({ detail }: { detail: InsightDetail }) {
  return (
    <aside aria-labelledby="insight-related" className={styles.related}>
      <h2 id="insight-related" className={styles.relatedTitle}>
        Related insights
      </h2>
      <ul className={styles.relatedList}>
        {detail.related.map((r) => (
          <li key={r.id} className="flex">
            <InsightCard item={r} />
          </li>
        ))}
      </ul>
    </aside>
  )
}
