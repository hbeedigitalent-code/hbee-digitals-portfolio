import Link from 'next/link'
import { InsightArticleBody } from './InsightArticleBody'
import { InsightReadingProgress } from './InsightReadingProgress'
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
 *   breadcrumb, hero (topic, title, date / updated / author / read time when stored,
 *   stored excerpt as the summary lede, image),
 *   body (existing sanitizer → heading ids), TOC only with ≥ 3 real headings,
 *   the mapped Hbee capability, related Insights only when a real relation exists,
 *   and the Growth Review block only for articles in the explicit diagnostic set.
 * No callouts are manufactured; no metadata is filled in.
 */
const ARTICLE_ID = 'insight-article'

export function InsightDetailPage({ detail }: { detail: InsightDetail }) {
  const hasToc = detail.toc.length > 0
  const hasRelated = detail.related.length > 0
  return (
    <>
      {detail.html && <InsightReadingProgress articleId={ARTICLE_ID} />}
      <InsightHero detail={detail} />
      {(detail.html || hasRelated) && (
        <SiteSection tone="white" spacing="compact" aria-label="Article" className={styles.articleBand}>
          <div className={cn(styles.articleGrid, hasToc && styles.articleGridToc, hasRelated && styles.articleGridRelated, !hasToc && !hasRelated && styles.articleGridLean)}>
            {hasToc && <ArticleToc detail={detail} />}
            <div className={styles.articleMain}>
              {detail.html ? <InsightArticleBody html={detail.html} id={ARTICLE_ID} /> : null}
              {detail.capabilityLinks.length > 0 && <RelatedCapability detail={detail} />}
            </div>
            {hasRelated && <RelatedInsights detail={detail} />}
          </div>
        </SiteSection>
      )}
      {detail.showGrowthReview && (
        <InsightsCta
          eyebrow="Ready to apply what you’ve learned"
          headline="Find what should move next."
          copy="If this article describes your situation but you are not sure what to prioritise, a focused Growth Review helps identify what deserves attention first."
        />
      )}
    </>
  )
}

function InsightHero({ detail }: { detail: InsightDetail }) {
  const image = detail.image
  return (
    <SiteSection tone="cloud" spacing="none" contained={false} aria-labelledby="insight-title" className="overflow-hidden">
      <div className={cn(styles.articleHero, !image && styles.articleHeroTextOnly)}>
        <div className={styles.articleHeroText}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <ol className={styles.breadcrumbList}>
              <li>
                <Link href="/insights" className={styles.breadcrumbLink}>
                  Insights
                </Link>
              </li>
              <li aria-hidden="true" className={styles.breadcrumbSep}>
                <SiteArrow size={13} />
              </li>
              <li aria-current="page" className={styles.breadcrumbCurrent}>
                <span title={detail.title}>{detail.title}</span>
              </li>
            </ol>
          </nav>
          <div className="mt-5">
            <TopicLabel topic={detail.topic} />
          </div>
          <h1 id="insight-title" className="mt-3 font-hb-display text-[clamp(2.125rem,1.6rem+1.9vw,3.25rem)] font-bold leading-[1.06] tracking-[-0.035em] text-hb-fg">
            {detail.title}
          </h1>
          <InsightMeta item={detail} className="mt-5" authorHref="/about" updated={detail.updatedAt} />
          {detail.excerpt && <p className="mt-5 max-w-[38rem] text-[length:var(--hb-text-lede)] leading-[1.55] text-hb-fg-body">{detail.excerpt}</p>}
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

/* Quiet, editorial context — the mapped primary capability, and a secondary when one is mapped. */
function RelatedCapability({ detail }: { detail: InsightDetail }) {
  const [primary, ...others] = detail.capabilityLinks
  return (
    <aside aria-labelledby="insight-capability" className={styles.capabilityBlock}>
      <p id="insight-capability" className={styles.capabilityLabel}>
        Related Hbee capability
      </p>
      <Link href={primary.href} className={styles.capabilityLink}>
        {primary.name}
        <SiteArrow size={15} />
      </Link>
      {others.length > 0 && (
        <p className={styles.capabilityAlso}>
          Also relevant:{' '}
          {others.map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ', '}
              <Link href={c.href} className={styles.bylineLink}>
                {c.name}
              </Link>
            </span>
          ))}
        </p>
      )}
    </aside>
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
