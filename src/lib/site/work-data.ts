/**
 * Server-side data adapter for the rebuilt Work family (landing + case study).
 *
 *   raw portfolio_items row  →  WorkItem / WorkDetail (safe, truthful)  →  components
 *
 * - Server only. Same access path as the homepage loader: the anonymous
 *   public client, `is_active = true`, RLS applies. No service-role key, no
 *   admin loaders, no writes.
 * - Reuses the homepage's text/image/slug helpers — including the reserved-
 *   slug rule that excludes the known mislabelled row (slug `portfolio`,
 *   Taltis project stored as "Voltix"). No second validation rule.
 * - Nothing is inferred. Fields the CMS does not hold — or holds without
 *   verification — are left out: no metrics, no capability attribution, no
 *   client-vs-concept flag, no "Hbee role" (`project_type` is shown only as
 *   the project type the editor entered).
 * - Never throws. A failed read returns an empty result (landing) or null
 *   (detail → 404).
 *
 * The normalisers (buildWorkData, toWorkDetail) are pure and exported so the
 * same code path can be exercised in tests with raw rows.
 */

import { cache } from 'react'

import { supabase } from '@/lib/supabase'
import { absoluteUrl } from '@/lib/blog-utils'
import { imageUrl, isValidPortfolioSlug, text, truncate, type Row } from './home-data'

if (typeof window !== 'undefined') {
  throw new Error('src/lib/site/work-data.ts is server-only')
}

/** Case-study route. */
export function workDetailHref(slug: string) {
  return `/work/${slug}`
}

/* ── Shared field rules ─────────────────────────────────────── */

function clientOf(row: Row) {
  return text(row.client_name) ?? text(row.name) ?? text(row.title)
}

/** The stored title, only when it says something the client name doesn't. */
function distinctTitle(row: Row, client: string) {
  const title = text(row.title)
  return title && title.toLowerCase() !== client.toLowerCase() ? title : undefined
}

function httpsUrl(value: unknown): string | undefined {
  const v = text(value)
  return v && /^https:\/\/[^\s]+$/i.test(v) ? v : undefined
}

function liveUrlOf(row: Row) {
  return httpsUrl(row.website_url) ?? httpsUrl(row.url) ?? httpsUrl(row.project_url)
}

/**
 * Category grouping key — FORMATTING ONLY: trimmed, inner whitespace
 * collapsed (both done by text()), compared case-insensitively. "Fashion",
 * "fashion" and " Fashion " group; "Food & Beverage" and "Food and Beverage"
 * do not — that would be reinterpreting the editor's category.
 */
function categoryKey(label: string) {
  return label.toLowerCase()
}

/* ── Landing ────────────────────────────────────────────────── */

export interface WorkItem {
  id: string
  slug: string
  client: string
  title?: string
  /** One display label for the item's category group (see buildWorkData). */
  category?: string
  categoryKey?: string
  /** The editor's project-type text, verbatim. */
  projectType?: string
  description?: string
  image?: { src: string; alt: string }
  /** Rebuild case-study page. */
  href: string
  websiteUrl?: string
  featured: boolean
}

export interface WorkCategory {
  key: string
  label: string
  count: number
}

export interface WorkData {
  items: WorkItem[]
  /** Distinct categories actually present, most-used first. */
  categories: WorkCategory[]
  /** Rows returned but excluded (invalid/reserved slug or no name). */
  excluded: number
}

function toWorkItem(row: Row): WorkItem | null {
  const slug = text(row.slug)
  if (!isValidPortfolioSlug(slug)) return null
  const client = clientOf(row)
  if (!client) return null

  const category = text(row.category) ?? text(row.industry)
  const image = imageUrl(row.image_url) ?? imageUrl(row.featured_image) ?? imageUrl(row.after_image)

  return {
    id: String(row.id),
    slug,
    client,
    title: distinctTitle(row, client),
    category,
    categoryKey: category ? categoryKey(category) : undefined,
    projectType: text(row.project_type),
    description: truncate(text(row.description) ?? text(row.brief) ?? text(row.challenge), 190),
    image: image ? { src: image, alt: `${client} — project preview` } : undefined,
    href: workDetailHref(slug),
    websiteUrl: liveUrlOf(row),
    featured: Boolean(row.featured),
  }
}

/** Pure: rows in CMS display order → landing data. */
export function buildWorkData(rows: Row[]): WorkData {
  // Order: featured first, then display_order (the CMS's own ordering).
  const items = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(Boolean(b.row.featured)) - Number(Boolean(a.row.featured)) || a.index - b.index)
    .map(({ row }) => toWorkItem(row))
    .filter((w): w is WorkItem => w !== null)

  // Group trivially different spellings; the group's label is its most-used
  // existing spelling (first seen on a tie). Items display that label so one
  // filter never shows two spellings.
  const groups = new Map<string, { count: number; spellings: Map<string, number> }>()
  for (const item of items) {
    if (!item.categoryKey || !item.category) continue
    const g = groups.get(item.categoryKey) ?? { count: 0, spellings: new Map<string, number>() }
    g.count++
    g.spellings.set(item.category, (g.spellings.get(item.category) ?? 0) + 1)
    groups.set(item.categoryKey, g)
  }
  const label = (key: string) => {
    const s = groups.get(key)!.spellings
    let best = ''
    let n = 0
    for (const [spelling, c] of s) if (c > n) [best, n] = [spelling, c]
    return best
  }
  for (const item of items) if (item.categoryKey) item.category = label(item.categoryKey)

  const categories = [...groups.entries()]
    .map(([key, g]) => ({ key, label: label(key), count: g.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  return { items, categories, excluded: rows.length - items.length }
}

export async function getWorkData(): Promise<WorkData> {
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(60)
    if (error || !data) return { items: [], categories: [], excluded: 0 }
    return buildWorkData(data as Row[])
  } catch {
    return { items: [], categories: [], excluded: 0 }
  }
}

/* ── Case study detail ──────────────────────────────────────── */

export interface WorkImage {
  src: string
  alt: string
  /** Set only for genuine before/after media. */
  label?: 'Before' | 'After'
}

export interface WorkDetail {
  slug: string
  client: string
  /** H1: the stored title when distinct from the client, else the client. */
  headline: string
  /** True when the headline is a stored project title (client shown separately). */
  hasTitle: boolean
  summary?: string
  category?: string
  /** Industry, only when it differs from the category. */
  industry?: string
  projectType?: string
  /** `brief`, only when it adds to the summary. */
  context?: string
  /** `challenge`. */
  constraint?: string
  /** `solution` — the stored description of the work, one factual paragraph. */
  approach?: string
  /** `results` / `results_summary`, qualitative only (no numerals → no unverified figures). */
  outcome?: string
  heroImage?: WorkImage
  /** Real media beyond the hero image, de-duplicated. */
  gallery: WorkImage[]
  /** A genuine before/after pair (both sides present). */
  beforeAfter?: [WorkImage, WorkImage]
  liveUrl?: string
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const v = JSON.parse(value)
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  }
  return []
}

/** Pure: one portfolio row → detail model, or null when it can't be shown. */
export function toWorkDetail(row: Row): WorkDetail | null {
  const slug = text(row.slug)
  if (!isValidPortfolioSlug(slug)) return null
  const client = clientOf(row)
  if (!client) return null

  const title = distinctTitle(row, client)
  const summary = text(row.description)
  const brief = text(row.brief)
  const category = text(row.category)
  const industry = text(row.industry)
  const outcomeText = text(row.results_summary) ?? text(row.results)

  // Media: hero first, then every other real image once.
  const seen = new Set<string>()
  const take = (src: string | undefined) => (src && !seen.has(src) ? (seen.add(src), src) : undefined)
  const heroSrc = take(imageUrl(row.image_url) ?? imageUrl(row.featured_image) ?? imageUrl(row.after_image))
  const before = imageUrl(row.before_image)
  const after = imageUrl(row.after_image)
  // A pair needs both genuine sides and must not repeat the hero. An unpaired
  // "before" image is left out: unlabelled, it could read as Hbee's work.
  const pair = before && after && before !== after && before !== heroSrc && after !== heroSrc ? ([before, after] as const) : undefined
  if (pair) pair.forEach((s) => seen.add(s))
  const gallery: WorkImage[] = []
  const extra = [imageUrl(row.featured_image), pair ? undefined : after, ...list(row.gallery_images).map(imageUrl)]
  extra.forEach((src) => {
    const s = take(src)
    if (s) gallery.push({ src: s, alt: `${client} — project image ${gallery.length + 1}` })
  })

  return {
    slug,
    client,
    headline: title ?? client,
    hasTitle: Boolean(title),
    summary,
    category: category ?? industry,
    industry: category && industry && industry.toLowerCase() !== category.toLowerCase() ? industry : undefined,
    projectType: text(row.project_type),
    context: brief && brief !== summary ? brief : undefined,
    constraint: text(row.challenge),
    approach: text(row.solution),
    outcome: outcomeText && !/\d/.test(outcomeText) ? outcomeText : undefined,
    heroImage: heroSrc ? { src: heroSrc, alt: `${client} — project preview` } : undefined,
    gallery,
    beforeAfter: pair
      ? [
          { src: pair[0], alt: `${client} — before`, label: 'Before' },
          { src: pair[1], alt: `${client} — after`, label: 'After' },
        ]
      : undefined,
    liveUrl: liveUrlOf(row),
  }
}

export async function getWorkDetail(slug: string): Promise<WorkDetail | null> {
  if (!isValidPortfolioSlug(slug)) return null
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    return toWorkDetail(data as Row)
  } catch {
    return null
  }
}

/* ── Search / social metadata ───────────────────────────────── */

export interface WorkSeo {
  title: string
  description: string
  image?: string
  imageAlt?: string
}

/** Same rules as the former /portfolio/[slug]: stored SEO fields win, then the case study's own fields. */
const loadWorkSeo = cache(async (slug: string): Promise<WorkSeo | null> => {
  if (!isValidPortfolioSlug(slug)) return null
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (error || !data) return null
    const row = data as Row
    const detail = toWorkDetail(row)
    if (!detail) return null
    const hero = detail.heroImage
    return {
      title: text(row.seo_title) ?? detail.client,
      description:
        text(row.seo_description) ?? detail.summary ?? 'Conversion-focused ecommerce and digital growth case study.',
      image: hero?.src ? absoluteUrl(hero.src) : undefined,
      imageAlt: hero?.alt,
    }
  } catch {
    return null
  }
})

export function getWorkSeo(slug: string) {
  return loadWorkSeo(slug)
}
