/**
 * Server-side data adapter for the rebuilt Insights family.
 *
 *   raw blog_posts row  →  InsightSummary / InsightDetail (safe, truthful)  →  components
 *
 * - Server only. Same access path as the live /blog pages and the homepage
 *   loader: the anonymous public client, `status = 'published'`, RLS applies.
 *   No service-role key, no admin loaders, no writes.
 * - Article bodies go through the EXISTING safe pipeline used by /blog/[slug]:
 *   cleanBlogHtml → sanitizeBlogHtml (sanitize-html allowlist) → addHeadingIds.
 *   No second HTML renderer.
 * - Nothing is invented: author, date, image, topic and read time appear only
 *   when stored. The only derived value is an estimated read time (same 200
 *   wpm formula the CMS editor uses) when none is stored — flagged `estimated`.
 * - Never throws. Failed reads return empty data (landing) or null (→ 404).
 *
 * buildInsightsData / toInsightDetail are pure and exported so the same code
 * path can be exercised in tests with raw rows.
 */

import { cache } from 'react'

import { supabase } from '@/lib/supabase'
import { absoluteUrl, addHeadingIds, cleanBlogHtml, estimateReadTime, insightCanonical, insightTags, validReadTime, SITE_URL } from '@/lib/blog-utils'
import { sanitizeBlogHtml } from '@/lib/sanitize-blog-html'
import { imageUrl, text, truncate, type Row } from './home-data'
import { insightCapabilitiesFor, GROWTH_REVIEW_CTA_SLUGS, insightCapabilityName, type InsightCapabilitySlug } from './insight-capabilities'
import { isFeatureEligible, isPubliclyEligible } from './insight-publication'

if (typeof window !== 'undefined') {
  throw new Error('src/lib/site/insights-data.ts is server-only')
}

const ORGANIZATION_ID = `${SITE_URL}#organization`

/** Article route. */
export function insightDetailHref(slug: string) {
  return `/insights/${slug}`
}

const SLUG_PATTERN = /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/

/* ── Models ─────────────────────────────────────────────────── */

export interface InsightTopic {
  key: string
  label: string
  count: number
}

export interface ReadTime {
  label: string
  /** True when computed from the article body (no stored value). */
  estimated: boolean
}

export interface InsightSummary {
  id: string
  slug: string
  title: string
  excerpt?: string
  /** First stored tag, shown with its group's display label. */
  topic?: string
  topicKey?: string
  /** All of the article's tag keys (for filtering / related). */
  topicKeys: string[]
  /** Code-side capability map: [primary, secondary?]; empty for cross-capability articles. */
  capabilities: InsightCapabilitySlug[]
  image?: { src: string; alt: string }
  author?: string
  publishedAt?: string
  readTime?: ReadTime
  /** The CMS `is_featured` flag. */
  featured: boolean
  href: string
}

export interface InsightsData {
  items: InsightSummary[]
  topics: InsightTopic[]
  /** The lead article and why it leads ("featured" = CMS flag; "latest" = most recent). */
  lead?: { item: InsightSummary; reason: 'featured' | 'latest' }
}

export interface TocItem {
  id: string
  text: string
  level: number
}

export interface InsightCapabilityLink {
  slug: string
  name: string
  href: string
}

export interface InsightDetail extends InsightSummary {
  /** Sanitized article HTML with heading ids. Empty when no stored body. */
  html: string
  /** "Last updated" label — only when updated_at is at least a calendar day after published_at. */
  updatedAt?: string
  /** Mapped primary (and optional secondary) capability for the closing context block. */
  capabilityLinks: InsightCapabilityLink[]
  /** True for articles whose natural ending is diagnosis / prioritisation (explicit code-side set). */
  showGrowthReview: boolean
  /** H2/H3 headings — only kept when there are enough to be useful. */
  toc: TocItem[]
  related: InsightSummary[]
}

/* ── Field rules ────────────────────────────────────────────── */

/** Topic grouping key — FORMATTING ONLY: trimmed, whitespace collapsed (text()), case-insensitive. */
function topicKey(tag: string) {
  return tag.toLowerCase()
}

function tagsOf(row: Row): string[] {
  return insightTags(row.tags)
}

function bodyText(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function readTimeOf(row: Row, rawContent?: string): ReadTime | undefined {
  const stored = validReadTime(row.read_time)
  if (stored) return { label: stored, estimated: false }
  if (rawContent && bodyText(rawContent).split(' ').filter(Boolean).length >= 50) {
    return { label: estimateReadTime(rawContent), estimated: true }
  }
  return undefined
}

function toSummary(row: Row, rawContent?: string): InsightSummary | null {
  const slug = text(row.slug)
  const title = text(row.title)
  if (!slug || !SLUG_PATTERN.test(slug) || !title) return null
  const tags = tagsOf(row)
  const image = imageUrl(row.featured_image)
  const published = text(row.published_at)
  return {
    id: String(row.id),
    slug,
    title,
    excerpt: truncate(text(row.excerpt), 220),
    topic: tags[0],
    topicKey: tags[0] ? topicKey(tags[0]) : undefined,
    topicKeys: [...new Set(tags.map(topicKey))],
    capabilities: insightCapabilitiesFor(slug),
    image: image ? { src: image, alt: text(row.featured_image_alt) ?? '' } : undefined,
    author: text(row.author),
    publishedAt: published && !Number.isNaN(Date.parse(published)) ? published : undefined,
    readTime: readTimeOf(row, rawContent),
    featured: Boolean(row.is_featured),
    href: insightDetailHref(slug),
  }
}

/** Groups trivially different spellings; each group shows its most-used spelling. */
function groupTopics(rows: Row[], items: InsightSummary[]) {
  const spellings = new Map<string, Map<string, number>>()
  const counts = new Map<string, number>()
  for (const row of rows) {
    const seen = new Set<string>()
    for (const tag of tagsOf(row)) {
      const k = topicKey(tag)
      const s = spellings.get(k) ?? new Map<string, number>()
      s.set(tag, (s.get(tag) ?? 0) + 1)
      spellings.set(k, s)
      if (!seen.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1)
      seen.add(k)
    }
  }
  const label = (k: string) => {
    let best = ''
    let n = 0
    for (const [sp, c] of spellings.get(k) ?? []) if (c > n) [best, n] = [sp, c]
    return best
  }
  for (const item of items) if (item.topicKey) item.topic = label(item.topicKey)
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: label(key), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

const byNewest = (a: InsightSummary, b: InsightSummary) => Date.parse(b.publishedAt ?? '0') - Date.parse(a.publishedAt ?? '0')

/**
 * Pure: PUBLIC rows → landing data. Callers pass rows already filtered by the public
 * publication rule. Items are newest-first. The lead is the first explicitly featured
 * article that is still inside its editorial feature window, otherwise the newest
 * article inside its window; an expired seasonal article stays in the archive but
 * never leads.
 */
export function buildInsightsData(rows: Row[], now: Date = new Date()): InsightsData {
  const pairs = rows.map((row) => ({ row, item: toSummary(row) })).filter((p): p is { row: Row; item: InsightSummary } => p.item !== null)
  const items = pairs.map((p) => p.item).sort(byNewest)
  const topics = groupTopics(
    pairs.map((p) => p.row),
    items,
  )
  const eligible = items.filter((i) => isFeatureEligible(i.slug, now))
  const featured = eligible.find((i) => i.featured)
  const latest = eligible[0]
  const lead = featured ? { item: featured, reason: 'featured' as const } : latest ? { item: latest, reason: 'latest' as const } : undefined
  return { items, topics, lead }
}

/** UTC calendar-day number, for comparing published / updated dates. */
function utcDay(iso: string) {
  const d = new Date(iso)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000
}

/** "Last updated" date — only when updated_at falls at least one calendar day after published_at. */
export function insightUpdatedLabel(publishedAt?: string, updatedAt?: string): string | undefined {
  if (!publishedAt || !updatedAt) return undefined
  if (Number.isNaN(Date.parse(publishedAt)) || Number.isNaN(Date.parse(updatedAt))) return undefined
  return utcDay(updatedAt) - utcDay(publishedAt) >= 1 ? formatInsightDate(updatedAt) : undefined
}

/**
 * Related Insights: another PUBLIC article that shares the primary/secondary capability
 * first, then shared tags; never itself; nothing when genuinely unrelated. Max 3.
 */
function relatedFor(summary: InsightSummary, candidates: Row[], now: Date): InsightSummary[] {
  const myTopics = new Set(summary.topicKeys)
  const myCaps = new Set(summary.capabilities)
  return candidates
    .filter((r) => isPubliclyEligible(r, now))
    .map((r) => toSummary(r))
    .filter((s): s is InsightSummary => s !== null && s.slug !== summary.slug)
    .map((s) => ({ s, caps: s.capabilities.filter((c) => myCaps.has(c)).length, tags: s.topicKeys.filter((k) => myTopics.has(k)).length }))
    .filter((x) => x.caps > 0 || x.tags > 0)
    .sort((a, b) => Number(b.caps > 0) - Number(a.caps > 0) || b.tags - a.tags || byNewest(a.s, b.s))
    .slice(0, 3)
    .map((x) => x.s)
}

/**
 * Pure: article row + candidate rows → detail model, or null when it can't be shown.
 * The article row itself is NOT gated here (admin preview renders drafts); the loaders
 * gate it. Candidate rows are always gated by the public publication rule.
 */
export function toInsightDetail(row: Row, candidates: Row[] = [], now: Date = new Date()): InsightDetail | null {
  const raw = typeof row.content === 'string' ? row.content.trim() : ''
  const summary = toSummary(row, raw || undefined)
  if (!summary) return null

  let html = ''
  let toc: TocItem[] = []
  if (raw && bodyText(raw)) {
    // Render-time only (stored content untouched): an in-body <h1> would be a
    // second page H1, so it is shown as an H2.
    const clean = sanitizeBlogHtml(cleanBlogHtml(raw)).replace(/<(\/?)h1\b/gi, '<$1h2')
    const out = addHeadingIds(clean)
    html = out.html
    toc = out.toc.length >= 3 ? out.toc : []
  }

  const related = relatedFor(summary, candidates, now)
  const capabilityLinks = summary.capabilities.flatMap((slug) => {
    const name = insightCapabilityName(slug)
    return name ? [{ slug, name, href: `/services/${slug}` }] : []
  })

  return {
    ...summary,
    html,
    toc,
    related,
    updatedAt: insightUpdatedLabel(summary.publishedAt, text(row.updated_at)),
    capabilityLinks,
    showGrowthReview: GROWTH_REVIEW_CTA_SLUGS.has(summary.slug),
  }
}

/* ── Loaders ────────────────────────────────────────────────── */

const CARD_FIELDS = 'id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, is_featured, read_time, published_at, status'

export async function getInsightsData(): Promise<InsightsData> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(CARD_FIELDS)
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(60)
    if (error || !data) return { items: [], topics: [] }
    const now = new Date()
    return buildInsightsData((data as Row[]).filter((row) => isPubliclyEligible(row, now)), now)
  } catch {
    return { items: [], topics: [] }
  }
}

export async function getInsightDetail(slug: string): Promise<InsightDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  try {
    const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
    if (error || !data || !isPubliclyEligible(data as Row)) return null
    const { data: others } = await supabase
      .from('blog_posts')
      .select(CARD_FIELDS)
      .eq('status', 'published')
      .neq('slug', slug)
      .order('published_at', { ascending: false })
      .limit(40)
    return toInsightDetail(data as Row, (others as Row[] | null) ?? [])
  } catch {
    return null
  }
}

/** Date display — UTC so server output is stable. */
const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export function formatInsightDate(iso?: string) {
  return iso ? DATE.format(new Date(iso)) : undefined
}

/* ── Search / social metadata + structured data ─────────────── */

export interface InsightSeo {
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  author: string
  keywords: string[]
  canonical: string
  image: string
  imageAlt: string
  publishedAt?: string
  modifiedAt?: string
  blogPostingLd: Record<string, unknown>
  breadcrumbLd: Record<string, unknown>
}

/**
 * Canonical: the article's own /insights URL. A stored canonical_url is honoured
 * only when it points off-site (a deliberate cross-post); one that points at this
 * site's retired /blog/ path would contradict the redirect, so it is ignored.
 */
function canonicalOf(row: Row, slug: string) {
  return insightCanonical(slug, text(row.canonical_url))
}

const loadInsightSeo = cache(async (slug: string): Promise<InsightSeo | null> => {
  if (!SLUG_PATTERN.test(slug)) return null
  try {
    const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
    if (error || !data || !isPubliclyEligible(data as Row)) return null
    const row = data as Row
    const heading = text(row.title)
    if (!heading) return null
    const title = text(row.seo_title) ?? text(row.og_title) ?? heading
    const description = text(row.seo_description) ?? text(row.og_description) ?? (text(row.excerpt) ?? '').slice(0, 160)
    const namedAuthor = text(row.author)
    const author = namedAuthor ?? 'Hbee Digitals'
    const canonical = canonicalOf(row, slug)
    const image = absoluteUrl(text(row.og_image) ?? text(row.featured_image))
    const keywords = [...new Set([text(row.focus_keyword), ...tagsOf(row)].filter((k): k is string => Boolean(k)))]
    const published = text(row.published_at)
    const modified = text(row.updated_at)
    return {
      title,
      description,
      ogTitle: text(row.og_title) ?? title,
      ogDescription: text(row.og_description) ?? description,
      author,
      keywords,
      canonical,
      image,
      imageAlt: text(row.featured_image_alt) ?? heading,
      publishedAt: published,
      modifiedAt: modified,
      blogPostingLd: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title.slice(0, 110),
        description: description || undefined,
        image: [image],
        datePublished: published,
        dateModified: modified ?? published,
        // A named author is a Person (linked to /about); with no stored author the publisher
        // is the author — a reference to the site Organization, never an invented Person.
        author: namedAuthor ? { '@type': 'Person', name: namedAuthor, url: `${SITE_URL}/about` } : { '@id': ORGANIZATION_ID },
        publisher: { '@id': `${SITE_URL}#organization` },
        keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      },
      breadcrumbLd: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_URL}/insights` },
          { '@type': 'ListItem', position: 3, name: heading, item: canonical },
        ],
      },
    }
  } catch {
    return null
  }
})

export function getInsightSeo(slug: string) {
  return loadInsightSeo(slug)
}

/**
 * Hub structured data: CollectionPage + ItemList of the articles the hub currently
 * shows + BreadcrumbList. The publisher is a reference to the site Organization
 * (`@id`), never a second Organization node. No Blog / FAQPage markup.
 */
export function buildInsightsHubLd(items: Pick<InsightSummary, 'slug' | 'title'>[], meta: { name: string; description: string }) {
  const url = `${SITE_URL}/insights`
  return {
    collectionPage: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#webpage`,
      url,
      name: meta.name,
      description: meta.description,
      publisher: { '@id': ORGANIZATION_ID },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}${insightDetailHref(item.slug)}`,
          name: item.title,
        })),
      },
    },
    breadcrumb: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Insights', item: url },
      ],
    },
  }
}
