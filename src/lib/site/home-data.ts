/**
 * Server-side data loaders for the rebuilt homepage.
 *
 * - Server only. Uses the existing anonymous public client (src/lib/supabase),
 *   the same access path the live server pages use for public CMS reads —
 *   no service-role credentials, RLS applies.
 * - Every field is optional downstream: a missing value is OMITTED, never
 *   replaced with an invented one. No fallback numbers, names or ratings.
 * - Never throws. A failed read returns [] and the section renders its
 *   empty state (or nothing), so the page always renders.
 */

import { supabase } from '@/lib/supabase'

/**
 * Which slugs may become a case-study URL. Mirrors isValidPortfolioSlug in
 * src/lib/portfolio-links.ts, which belongs to the SEO batch that is not yet
 * committed to main (and so is not on this branch). Replace this with the
 * shared helper once that batch lands and main is merged in.
 * Rejects the reserved slug `portfolio` (the known mislabelled row).
 */
const SLUG_PATTERN = /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/
const RESERVED_SLUGS = new Set(['portfolio'])

export function isValidPortfolioSlug(slug: string | null | undefined): slug is string {
  return typeof slug === 'string' && SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug)
}

if (typeof window !== 'undefined') {
  throw new Error('src/lib/site/home-data.ts is server-only')
}

/* ── Shared helpers ─────────────────────────────────────────── */

export type Row = Record<string, unknown>

export function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length ? cleaned : undefined
}

export function truncate(value: string | undefined, max: number): string | undefined {
  if (!value || value.length <= max) return value
  const cut = value.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[,.;:\s]+$/, '')}…`
}

export function imageUrl(value: unknown): string | undefined {
  const v = text(value)
  if (!v) return undefined
  if (v.startsWith('/') || /^https:\/\/[^\s]+$/i.test(v)) return v
  return undefined
}

function stringList(value: unknown, max: number): string[] {
  let list: unknown = value
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  return list.map(text).filter((v): v is string => Boolean(v)).slice(0, max)
}

/* ── Selected work ──────────────────────────────────────────── */

export interface FeaturedWork {
  id: string
  slug: string
  client: string
  /** Project title, only when it says something the client name doesn't. */
  title?: string
  industry?: string
  context?: string
  services: string[]
  image?: { src: string; alt: string }
  /** Only when the CMS row holds both a numeric value and a label. */
  result?: { value: string; label: string }
}

function toFeaturedWork(row: Row): FeaturedWork | null {
  const slug = text(row.slug)
  if (!isValidPortfolioSlug(slug)) return null

  const client = text(row.client_name) ?? text(row.name) ?? text(row.title)
  if (!client) return null

  const title = text(row.title)
  const image = imageUrl(row.image_url) ?? imageUrl(row.featured_image) ?? imageUrl(row.after_image)
  const metricValue = text(row.metric_value)
  const metricLabel = text(row.metric_label)

  return {
    id: String(row.id),
    slug,
    client,
    title: title && title.toLowerCase() !== client.toLowerCase() ? title : undefined,
    industry: text(row.industry) ?? text(row.category),
    context: truncate(text(row.challenge) ?? text(row.brief) ?? text(row.description), 170),
    services: stringList(row.technologies_used, 3),
    image: image ? { src: image, alt: `${client} — project preview` } : undefined,
    result: metricValue && metricLabel && /\d/.test(metricValue) ? { value: metricValue, label: metricLabel } : undefined,
  }
}

export async function getFeaturedWork(limit = 3): Promise<FeaturedWork[]> {
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(24)
    if (error || !data) return []

    return (data as Row[])
      .map((row, index) => ({ row, index }))
      .sort((a, b) => Number(Boolean(b.row.featured)) - Number(Boolean(a.row.featured)) || a.index - b.index)
      .map(({ row }) => toFeaturedWork(row))
      .filter((w): w is FeaturedWork => w !== null)
      .slice(0, limit)
  } catch {
    return []
  }
}

/* ── Proof ──────────────────────────────────────────────────── */

export interface ProofQuote {
  id: string
  quote: string
  name: string
  role?: string
  company?: string
  avatar?: string
}

export async function getHomepageProof(limit = 2): Promise<ProofQuote[]> {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(12)
    if (error || !data) return []

    return (data as Row[])
      .map((row): ProofQuote | null => {
        const quote = text(row.content)
        const name = text(row.name)
        // A substantial proof moment needs a real quote and a real name.
        if (!quote || quote.length < 40 || !name) return null
        return {
          id: String(row.id),
          quote,
          name,
          role: text(row.position) ?? text(row.role),
          company: text(row.company),
          avatar: imageUrl(row.image_url) ?? imageUrl(row.avatar_url),
        }
      })
      .filter((q): q is ProofQuote => q !== null)
      .slice(0, limit)
  } catch {
    return []
  }
}

/* ── Insights (blog_posts) ──────────────────────────────────── */

export interface InsightCard {
  id: string
  slug: string
  title: string
  excerpt?: string
  category?: string
  readTime?: string
  publishedAt?: string
  image?: { src: string; alt: string }
}

const INSIGHT_FIELDS = 'id, title, slug, excerpt, featured_image, featured_image_alt, tags, read_time, published_at'

export async function getHomepageInsights(limit = 3): Promise<InsightCard[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(INSIGHT_FIELDS)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)
    if (error || !data) return []

    return (data as Row[])
      .map((row): InsightCard | null => {
        const slug = text(row.slug)
        const title = text(row.title)
        if (!slug || !title) return null
        const image = imageUrl(row.featured_image)
        const published = text(row.published_at)
        return {
          id: String(row.id),
          slug,
          title,
          excerpt: truncate(text(row.excerpt), 140),
          category: stringList(row.tags, 1)[0],
          readTime: text(row.read_time),
          publishedAt: published && !Number.isNaN(Date.parse(published)) ? published : undefined,
          image: image ? { src: image, alt: text(row.featured_image_alt) ?? '' } : undefined,
        }
      })
      .filter((p): p is InsightCard => p !== null)
  } catch {
    return []
  }
}
