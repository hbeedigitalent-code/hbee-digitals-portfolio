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
 *   verification — are left out: no metrics, no inferred capability attribution, no
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
import { portfolioCreativeEnabled, type PortfolioMedia } from '@/lib/portfolio-creative'
import {
  capabilityRefs, caseStudyHref, engagementTypeOf, isCaseStudy, projectStatusOf, videoPlayback,
  type CapabilityRef, type EngagementType, type ProjectStatus,
} from './work-classification'

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
  /** Present ONLY when the creative rollout flag is on (see getWorkData). */
  creative?: WorkItemCreative
}

export interface WorkItemCreative {
  engagement: EngagementType
  status: ProjectStatus
  /** Presentation type, independent of engagement. False when the column is unavailable. */
  caseStudy: boolean
  /** Explicit assignments only, in approved order. */
  capabilities: CapabilityRef[]
}

/** Per-listing creative reads, keyed by portfolio id. */
export interface WorkCreativeIndex {
  capabilities: Record<string, string[]>
  /** First visible typed media, used only when the parent has no cover image. */
  cover: Record<string, { src: string; alt: string }>
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

function toWorkItem(row: Row, creative?: WorkCreativeIndex): WorkItem | null {
  const slug = text(row.slug)
  if (!isValidPortfolioSlug(slug)) return null
  const client = clientOf(row)
  if (!client) return null

  const category = text(row.category) ?? text(row.industry)
  const legacyImage = imageUrl(row.image_url) ?? imageUrl(row.featured_image) ?? imageUrl(row.after_image)
  const key = String(row.id)
  const typedCover = creative && !legacyImage ? creative.cover[key] : undefined
  const typedCoverSrc = typedCover ? imageUrl(typedCover.src) : undefined
  const image = legacyImage ?? typedCoverSrc
  // Case Study routing exists only in creative mode; a missing column reads as Standard Work.
  const caseStudy = Boolean(creative) && isCaseStudy(row.is_case_study)

  return {
    id: key,
    slug,
    client,
    title: distinctTitle(row, client),
    category,
    categoryKey: category ? categoryKey(category) : undefined,
    projectType: text(row.project_type),
    description: truncate(text(row.description) ?? text(row.brief) ?? text(row.challenge), 190),
    image: image ? { src: image, alt: (typedCoverSrc && text(typedCover?.alt)) || `${client} — project preview` } : undefined,
    href: caseStudy ? caseStudyHref(slug) : workDetailHref(slug),
    websiteUrl: liveUrlOf(row),
    featured: Boolean(row.featured),
    creative: creative
      ? { engagement: engagementTypeOf(row.engagement_type), status: projectStatusOf(row.project_status), caseStudy, capabilities: capabilityRefs(creative.capabilities[key] ?? []) }
      : undefined,
  }
}

/** Pure: rows in CMS display order → landing data. */
export function buildWorkData(rows: Row[], creative?: WorkCreativeIndex): WorkData {
  // Order: featured first, then display_order (the CMS's own ordering).
  const items = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(Boolean(b.row.featured)) - Number(Boolean(a.row.featured)) || a.index - b.index)
    .map(({ row }) => toWorkItem(row, creative))
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
    if (!portfolioCreativeEnabled()) return buildWorkData(data as Row[])
    // Flag on: classification comes from the parent row; assignments and the
    // media cover fallback are two extra bounded reads. Lazy import keeps the
    // flag-off path free of schema-dependent code.
    const { getWorkCreativeIndex } = await import('./portfolio-creative-data')
    return buildWorkData(data as Row[], await getWorkCreativeIndex((data as Row[]).map((row) => String(row.id))))
  } catch {
    return { items: [], categories: [], excluded: 0 }
  }
}

/** Case Studies only (flag on). Empty when none is marked or the column is unavailable. */
export async function getCaseStudies(): Promise<WorkItem[]> {
  const { items } = await getWorkData()
  return items.filter((item) => item.creative?.caseStudy)
}

/**
 * Other projects for a Case Study page: same category first, then the rest in
 * listing order. Case Studies and Standard Work are both eligible.
 */
export function relatedWork(items: WorkItem[], slug: string, limit = 3): WorkItem[] {
  const current = items.find((item) => item.slug === slug)
  const others = items.filter((item) => item.slug !== slug)
  const sameCategory = current?.categoryKey ? others.filter((item) => item.categoryKey === current.categoryKey) : []
  return [...sameCategory, ...others.filter((item) => !sameCategory.includes(item))].slice(0, limit)
}

export async function getRelatedWork(slug: string, limit = 3): Promise<WorkItem[]> {
  return relatedWork((await getWorkData()).items, slug, limit)
}

/**
 * Future homepage "Selected Case Studies": the existing `featured` flag is the
 * editor's curation signal, so only Case Studies that are ALSO featured qualify.
 * No Case Study is promoted automatically and no new column is needed.
 */
export function selectFeaturedCaseStudies(items: WorkItem[], limit = 3): WorkItem[] {
  return items.filter((item) => item.creative?.caseStudy && item.featured).slice(0, limit)
}

/** The project after `slug` in listing order (wrapping), or null when there is no other project. Flag-on use only. */
export async function getNextWork(slug: string): Promise<WorkItem | null> {
  const { items } = await getWorkData()
  const at = items.findIndex((item) => item.slug === slug)
  if (at < 0 || items.length < 2) return null
  return items[(at + 1) % items.length]
}

/* ── Case study detail ──────────────────────────────────────── */

export interface WorkImage {
  src: string
  alt: string
  /** Set only for genuine before/after media. */
  label?: 'Before' | 'After'
  creative?: PortfolioMedia
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
  /** Present ONLY when the creative rollout flag is on. Absent = legacy presentation. */
  creative?: WorkDetailCreative
}

export interface WorkVideo {
  id: string
  title: string
  description: string
  caption?: string
  /** image_url of the media row. */
  poster: { src: string; alt: string }
  videoUrl: string
  /** 'file' plays natively; 'link' is a hosted-player page, offered as an external link. */
  playback: 'file' | 'link'
  mimeType?: string
  captionsUrl?: string
  transcript?: string
}

export interface WorkDetailCreative {
  engagement: EngagementType
  status: ProjectStatus
  caseStudy: boolean
  capabilities: CapabilityRef[]
  videos: WorkVideo[]
  /** Platforms/tools exactly as the editor entered them. */
  technologies: string[]
  /** Case Study modules reused from EXISTING legacy fields; empty unless a Case Study with parseable data. */
  services: string[]
  process: WorkProcessStep[]
  testimonial?: WorkTestimonial
}

export interface WorkProcessStep {
  title: string
  text?: string
}

export interface WorkTestimonial {
  quote: string
  author?: string
  role?: string
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
export function toWorkDetail(row: Row, typedMedia: PortfolioMedia[] = [], creative?: { capabilities: readonly string[] }): WorkDetail | null {
  const slug = text(row.slug)
  if (!isValidPortfolioSlug(slug)) return null
  const client = clientOf(row)
  if (!client) return null

  const title = distinctTitle(row, client)
  const summary = text(row.description)
  // Creative mode falls back to the legacy `overview` when `brief` is empty: same concept, older column.
  const brief = text(row.brief) ?? (creative ? text(row.overview) : undefined)
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
  const visibleAll = typedMedia.filter((item) => item.is_visible).sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
  // Creative mode presents videos in their own module; stills form the gallery.
  const visibleMedia = creative ? visibleAll.filter((item) => (item.media_kind ?? 'image') !== 'video') : visibleAll
  const extra = [imageUrl(row.featured_image), pair ? undefined : after, ...(visibleMedia.length ? [] : list(row.gallery_images).map(imageUrl))]
  extra.forEach((src) => {
    const s = take(src)
    if (s) gallery.push({ src: s, alt: `${client} — project image ${gallery.length + 1}` })
  })
  visibleMedia.forEach((creative) => {
    const src = take(imageUrl(creative.image_url))
    if (src) gallery.push({ src, alt: text(creative.alt_text) || `${client} — project image`, creative })
  })
  const heroCreative = visibleMedia.find((item) => item.image_url === heroSrc)

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
    heroImage: heroSrc ? { src: heroSrc, alt: text(heroCreative?.alt_text) || `${client} — project preview`, creative: heroCreative } : undefined,
    gallery,
    beforeAfter: pair
      ? [
          { src: pair[0], alt: `${client} — before`, label: 'Before' },
          { src: pair[1], alt: `${client} — after`, label: 'After' },
        ]
      : undefined,
    liveUrl: liveUrlOf(row),
    creative: creative
      ? {
          engagement: engagementTypeOf(row.engagement_type),
          status: projectStatusOf(row.project_status),
          caseStudy: isCaseStudy(row.is_case_study),
          capabilities: capabilityRefs(creative.capabilities),
          videos: toWorkVideos(visibleAll, client),
          technologies: technologiesOf(row),
          // Case Study-only modules. Standard Work stays lightweight.
          services: isCaseStudy(row.is_case_study) ? servicesOf(row) : [],
          process: isCaseStudy(row.is_case_study) ? processOf(row) : [],
          testimonial: isCaseStudy(row.is_case_study) && engagementTypeOf(row.engagement_type) === 'client' ? testimonialOf(row) : undefined,
        }
      : undefined,
  }
}

function toWorkVideos(media: PortfolioMedia[], client: string): WorkVideo[] {
  const videos: WorkVideo[] = []
  for (const item of media) {
    if ((item.media_kind ?? 'image') !== 'video') continue
    const playback = videoPlayback(item.video_url)
    const poster = imageUrl(item.image_url)
    const title = text(item.title)
    const description = text(item.description)
    // The database requires all four; a row that fails here is simply not shown.
    if (!playback || !poster || !title || !description || !item.video_url) continue
    const transcript = typeof item.transcript === 'string' ? item.transcript.trim() : ''
    videos.push({
      id: item.id,
      title,
      description,
      caption: text(item.caption),
      poster: { src: poster, alt: text(item.alt_text) ?? `${client} — video poster` },
      videoUrl: item.video_url,
      playback: playback.mode,
      mimeType: playback.type,
      captionsUrl: httpsUrl(item.captions_url),
      transcript: transcript || undefined,
    })
  }
  return videos
}

/**
 * Platforms: the editor's `technologies_used` first, then the older `technologies` (jsonb) and
 * `technology` (text) columns - one concept, three generations of column.
 */
export function technologiesOf(row: Row): string[] {
  const seen = new Set<string>()
  const add = (entry: unknown) => {
    const value = text(entry)
    if (value) seen.add(value)
  }
  list(row.technologies_used).forEach(add)
  if (!seen.size) list(row.technologies).forEach(add)
  if (!seen.size && typeof row.technology === 'string') row.technology.split(/[\n,;]+/).forEach(add)
  return [...seen].slice(0, 12)
}

function labelOf(entry: unknown): string | undefined {
  if (typeof entry === 'string') return text(entry)
  if (entry && typeof entry === 'object') {
    const o = entry as Row
    return text(o.name) ?? text(o.title) ?? text(o.label) ?? text(o.service)
  }
  return undefined
}

/** Legacy `services` (jsonb): strings, or objects with a name/title/label. Anything else is ignored. */
export function servicesOf(row: Row): string[] {
  return [...new Set(list(row.services).map(labelOf).filter((v): v is string => Boolean(v)))].slice(0, 10)
}

/** Legacy `process` (jsonb): strings, or objects with title/name/step plus description/text. Nothing is invented. */
export function processOf(row: Row): WorkProcessStep[] {
  const steps: WorkProcessStep[] = []
  for (const entry of list(row.process)) {
    if (typeof entry === 'string') {
      const title = text(entry)
      if (title) steps.push({ title })
    } else if (entry && typeof entry === 'object') {
      const o = entry as Row
      const title = text(o.title) ?? text(o.name) ?? text(o.step) ?? text(o.heading) ?? text(o.label)
      const body = text(o.description) ?? text(o.text) ?? text(o.body) ?? text(o.details) ?? text(o.content)
      if (title) steps.push({ title, text: body && body !== title ? body : undefined })
      else if (body) steps.push({ title: body })
    }
    if (steps.length >= 8) break
  }
  return steps
}

/**
 * Legacy `testimonial` (text). Plain text is the quote. A JSON object with quote/text and optional
 * author/role is read as such. Never invents an attribution.
 */
export function testimonialOf(row: Row): WorkTestimonial | undefined {
  const raw = typeof row.testimonial === 'string' ? row.testimonial.trim() : ''
  if (!raw) return undefined
  if (/^[\[{]/.test(raw)) {
    try {
      const o = JSON.parse(raw)
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        const quote = text((o as Row).quote) ?? text((o as Row).text) ?? text((o as Row).content)
        if (!quote) return undefined
        return { quote, author: text((o as Row).author) ?? text((o as Row).name), role: text((o as Row).role) ?? text((o as Row).title) ?? text((o as Row).company) }
      }
    } catch { /* not JSON after all: fall through only if it is not structured-looking */ }
    return undefined
  }
  const quote = text(raw)
  return quote && quote.length >= 12 ? { quote } : undefined
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
    // Lazy import keeps the legacy path independent of schema-dependent reads.
    const { getPortfolioMedia, getPortfolioCapabilities } = await import('./portfolio-creative-data')
    const media = await getPortfolioMedia(String(data.id))
    if (!portfolioCreativeEnabled()) return toWorkDetail(data as Row, media)
    return toWorkDetail(data as Row, media, { capabilities: await getPortfolioCapabilities(String(data.id)) })
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
