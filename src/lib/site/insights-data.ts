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

import { supabase } from '@/lib/supabase'
import { addHeadingIds, cleanBlogHtml, estimateReadTime } from '@/lib/blog-utils'
import { sanitizeBlogHtml } from '@/lib/sanitize-blog-html'
import { imageUrl, text, truncate, type Row } from './home-data'

if (typeof window !== 'undefined') {
  throw new Error('src/lib/site/insights-data.ts is server-only')
}

/** Rebuild article route (→ /insights/[slug] at launch). */
export function insightDetailHref(slug: string) {
  return `/rebuild-insights/${slug}`
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

export interface InsightDetail extends InsightSummary {
  /** Sanitized article HTML with heading ids. Empty when no stored body. */
  html: string
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
  let list: unknown = row.tags
  if (typeof list === 'string') {
    const raw = list
    try {
      list = JSON.parse(raw)
    } catch {
      list = raw.split(',')
    }
  }
  if (!Array.isArray(list)) return []
  return list.map(text).filter((t): t is string => Boolean(t))
}

function bodyText(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function readTimeOf(row: Row, rawContent?: string): ReadTime | undefined {
  const stored = text(row.read_time)
  if (stored) return { label: /read/i.test(stored) ? stored : `${stored} read`, estimated: false }
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

/** Pure: rows (is_featured desc, published_at desc) → landing data. */
export function buildInsightsData(rows: Row[]): InsightsData {
  const pairs = rows.map((row) => ({ row, item: toSummary(row) })).filter((p): p is { row: Row; item: InsightSummary } => p.item !== null)
  const items = pairs.map((p) => p.item)
  const topics = groupTopics(
    pairs.map((p) => p.row),
    items,
  )
  const featured = items.find((i) => i.featured)
  const latest = [...items].sort((a, b) => Date.parse(b.publishedAt ?? '0') - Date.parse(a.publishedAt ?? '0'))[0]
  const lead = featured ? { item: featured, reason: 'featured' as const } : latest ? { item: latest, reason: 'latest' as const } : undefined
  return { items, topics, lead }
}

/** Pure: article row + candidate rows → detail model, or null when it can't be shown. */
export function toInsightDetail(row: Row, candidates: Row[] = []): InsightDetail | null {
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

  // Related: shares a real topic (formatting-normalised), newest first, never itself.
  const mine = new Set(summary.topicKeys)
  const related = mine.size
    ? candidates
        .map((r) => toSummary(r))
        .filter((s): s is InsightSummary => s !== null && s.slug !== summary.slug && s.topicKeys.some((k) => mine.has(k)))
        .sort((a, b) => Date.parse(b.publishedAt ?? '0') - Date.parse(a.publishedAt ?? '0'))
        .slice(0, 3)
    : []

  return { ...summary, html, toc, related }
}

/* ── Loaders ────────────────────────────────────────────────── */

const CARD_FIELDS = 'id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, is_featured, read_time, published_at'

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
    return buildInsightsData(data as Row[])
  } catch {
    return { items: [], topics: [] }
  }
}

export async function getInsightDetail(slug: string): Promise<InsightDetail | null> {
  if (!SLUG_PATTERN.test(slug)) return null
  try {
    const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
    if (error || !data) return null
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
