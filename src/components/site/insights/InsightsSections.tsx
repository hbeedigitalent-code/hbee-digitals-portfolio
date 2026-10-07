import Link from 'next/link'
import { cn } from '@/lib/cn'
import { formatInsightDate, type InsightsData, type InsightSummary } from '@/lib/site/insights-data'
import { CONTACT_HREF, GROWTH_REVIEW_HREF } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteImage } from '../primitives/SiteImage'
import { SiteArrow } from '../primitives/SiteIcons'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { InsightsBrowser } from './InsightsBrowser'
import homeStyles from '../home/home.module.css'
import capabilityStyles from '../capability/capability.module.css'
import styles from './insights.module.css'

/* Shared meta line: only stored values — date, author, read time. */
export function InsightMeta({ item, className }: { item: InsightSummary; className?: string }) {
  const date = formatInsightDate(item.publishedAt)
  const parts: { key: string; node: React.ReactNode }[] = []
  if (date) parts.push({ key: 'date', node: <time dateTime={item.publishedAt}>{date}</time> })
  if (item.author) parts.push({ key: 'author', node: <span>By {item.author}</span> })
  if (item.readTime)
    parts.push({ key: 'rt', node: <span>{item.readTime.estimated ? `About ${item.readTime.label}` : item.readTime.label}</span> })
  if (!parts.length) return null
  return (
    <p className={cn(styles.meta, className)}>
      {parts.map((p, i) => (
        <span key={p.key}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {i > 0 && <span className="sr-only">, </span>}
          {p.node}
        </span>
      ))}
    </p>
  )
}

export function TopicLabel({ topic }: { topic?: string }) {
  if (!topic) return null
  return <p className={styles.topicLabel}>{topic}</p>
}

/* ── 01 — Hero (Cloud): content-led; the lead article on the right ── */

export function InsightsHero({ lead }: { lead: InsightsData['lead'] }) {
  return (
    <SiteSection tone="cloud" spacing="none" aria-labelledby="insights-hero-title" className="overflow-hidden">
      <SiteGrid className={cn('items-center gap-y-10 pb-[var(--hb-space-section-compact)] pt-[clamp(2.5rem,5vw,4.5rem)] lg:pt-12', styles.heroLayout)}>
        <div className={cn('col-span-4 md:col-span-8', lead ? 'lg:col-span-6' : 'lg:col-span-8')}>
          <p className={homeStyles.eyebrow}>
            <span aria-hidden="true" className={homeStyles.eyebrowSignal} />
            Insights
          </p>
          <h1 id="insights-hero-title" className="mt-6 font-hb-display text-[clamp(2.5rem,1.7rem+2.5vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.04em] text-hb-fg">
            <span className="block">Practical insights for</span>
            <span className="block text-hb-blue">e-commerce growth.</span>
          </h1>
          <SiteLede className="mt-6">
            Guides, strategies and real lessons to help you build, market and scale your online store with confidence.
          </SiteLede>
          {lead && (
            <a href="#insights-collection" className={cn(styles.jump, 'mt-8')}>
              Browse all insights
              <SiteArrow size={16} className="rotate-90" />
            </a>
          )}
        </div>
        {lead && (
          <SiteReveal motion="focus" className="col-span-4 md:col-span-8 lg:col-span-6">
            <LeadCard item={lead.item} reason={lead.reason} />
          </SiteReveal>
        )}
      </SiteGrid>
    </SiteSection>
  )
}

function LeadCard({ item, reason }: { item: InsightSummary; reason: 'featured' | 'latest' }) {
  return (
    <article className={cn(styles.lead, !item.image && styles.leadNoImage)}>
      {item.image && (
        <div className={styles.leadMedia}>
          <SiteImage src={item.image.src} alt={item.image.alt} sizes="(min-width: 1024px) 45vw, 100vw" priority className={styles.mediaImage} />
        </div>
      )}
      <div className={styles.leadBody}>
        <p className={styles.leadBadge}>{reason === 'featured' ? 'Featured insight' : 'Latest insight'}</p>
        <TopicLabel topic={item.topic} />
        <h2 className="mt-2 font-hb-display text-[clamp(1.5rem,1.25rem+0.8vw,2rem)] font-bold leading-[1.15] tracking-[-0.025em] text-white">
          <Link href={item.href} className="after:absolute after:inset-0 after:content-['']">
            {item.title}
          </Link>
        </h2>
        {item.excerpt && <p className="mt-3 max-w-[34rem] leading-relaxed text-[#c3cfe2]">{item.excerpt}</p>}
        <InsightMeta item={item} className={styles.metaOnDark} />
        <span aria-hidden="true" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-white">
          Read article <SiteArrow size={16} />
        </span>
      </div>
    </article>
  )
}

/* ── 02–05 — Search, topics, latest insights (Cloud) ── */

export function InsightCard({ item, priority }: { item: InsightSummary; priority?: boolean }) {
  return (
    <article className={cn(styles.card, !item.image && styles.cardNoImage, 'group')}>
      {item.image ? (
        <div className={styles.cardMedia}>
          <span aria-hidden="true" className={styles.mediaFallback}>
            <HbeeModuleGlyph size={40} signal="quiet" />
          </span>
          <SiteImage src={item.image.src} alt={item.image.alt} sizes="(min-width: 1152px) 30vw, (min-width: 768px) 45vw, 100vw" priority={priority} className={styles.mediaImage} />
        </div>
      ) : (
        <span aria-hidden="true" className={styles.cardRule} />
      )}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <TopicLabel topic={item.topic} />
        <h3 className="mt-2 font-hb-display text-[1.1875rem] font-bold leading-snug tracking-[-0.015em] text-hb-fg">
          <Link href={item.href} className="after:absolute after:inset-0 after:content-[''] group-hover:underline">
            {item.title}
          </Link>
        </h3>
        {item.excerpt && <p className="mt-2 text-[0.9375rem] leading-relaxed text-hb-fg-body">{item.excerpt}</p>}
        <InsightMeta item={item} className="mt-auto pt-4" />
      </div>
    </article>
  )
}

function searchText(item: InsightSummary, topicLabels: Map<string, string>) {
  return [item.title, item.excerpt, ...item.topicKeys.map((k) => topicLabels.get(k) ?? k)].filter(Boolean).join(' ').toLowerCase()
}

export function InsightsCollection({ data }: { data: InsightsData }) {
  const { items, topics, lead } = data
  const labels = new Map(topics.map((t) => [t.key, t.label]))
  return (
    <SiteSection id="insights-collection" tone="cloud" spacing="compact" aria-labelledby="insights-latest-title" className={cn(styles.anchor, styles.collection)}>
      <h2 id="insights-latest-title" className="font-hb-display text-[length:var(--hb-text-h3)] font-bold tracking-[-0.02em] text-hb-fg">
        Latest insights
      </h2>
      {items.length === 0 ? (
        <InsightsEmptyState />
      ) : (
        <InsightsBrowser topics={topics} total={items.length}>
          <ul className={styles.grid}>
            {items.map((item) => {
              const isLead = lead?.item.id === item.id
              return (
                <li
                  key={item.id}
                  className="flex"
                  data-insight=""
                  data-view={isLead ? 'filtered-only' : undefined}
                  data-search={searchText(item, labels)}
                  data-topics={item.topicKeys.join('|')}
                  hidden={isLead || undefined}
                >
                  {/* The lead's grid copy shares its (prioritised) image. */}
                  <InsightCard item={item} priority={isLead} />
                </li>
              )
            })}
          </ul>
        </InsightsBrowser>
      )}
    </SiteSection>
  )
}

export function InsightsEmptyState() {
  return (
    <div className={styles.empty}>
      <span aria-hidden="true" className={styles.emptyGlyph}>
        <HbeeModuleGlyph size={36} signal="quiet" />
      </span>
      <div>
        <p className="font-hb-display text-[1.25rem] font-bold leading-tight text-hb-fg">Insights are on their way.</p>
        <p className="mt-2 max-w-[38rem] leading-relaxed text-hb-fg-body">
          Insights will appear here when published article data is available in the isolated preview environment.
        </p>
      </div>
    </div>
  )
}

/* ── Final CTA (Night) — shared by landing and article ── */

export function InsightsCta({ eyebrow, headline, copy }: { eyebrow: string; headline: string; copy: string }) {
  return (
    <SiteSection tone="night" aria-labelledby="insights-cta-title" className="overflow-hidden">
      <div aria-hidden="true" className={capabilityStyles.ctaGeometry}>
        <HbeeModuleGlyph signal="none" className={capabilityStyles.ctaGlyph} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph2}`} />
        <HbeeModuleGlyph signal="none" className={`${capabilityStyles.ctaGlyph} ${capabilityStyles.ctaGlyph3}`} />
      </div>
      <div className="relative max-w-[42rem]">
        <SiteReveal>
          <SiteEyebrow signal>{eyebrow}</SiteEyebrow>
        </SiteReveal>
        <SiteReveal index={1}>
          <SiteDisplayHeading id="insights-cta-title" size="h2" className="mt-6">
            {headline}
          </SiteDisplayHeading>
        </SiteReveal>
        <SiteReveal index={2}>
          <p className="mt-5 max-w-[36rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{copy}</p>
        </SiteReveal>
        <SiteReveal index={3} className="mt-8 flex flex-wrap items-center gap-3">
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
