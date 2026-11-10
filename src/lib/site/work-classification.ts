/**
 * Pure presentation rules for the creative Work experience (flag-gated by the
 * callers). No I/O and no server-only code, so the same rules are testable.
 *
 * Classification (set in the database, never inferred):
 *   engagement_type  'client' | 'studio_team'
 *   project_status   'completed' | 'ongoing'
 *
 * Defence in depth: ONLY the exact string 'client' may ever produce client
 * wording. Anything else - null, undefined, a different case, a typo, a column
 * that does not exist yet - is treated as studio work. Likewise only the exact
 * string 'ongoing' makes a project ongoing; everything else reads as completed.
 */

import { SERVICE_GROUPS } from '@/components/site/services/services-content'
import { isCapabilitySlug, type CapabilitySlug } from '@/lib/portfolio-creative'

export type EngagementType = 'client' | 'studio_team'
export type ProjectStatus = 'completed' | 'ongoing'

export function engagementTypeOf(value: unknown): EngagementType {
  return value === 'client' ? 'client' : 'studio_team'
}

export function projectStatusOf(value: unknown): ProjectStatus {
  return value === 'ongoing' ? 'ongoing' : 'completed'
}

/**
 * Presentation type is INDEPENDENT of engagement type: a client project may be
 * Standard Work or a Case Study, and a studio project may be either too. Only the
 * exact boolean `true` makes a Case Study; a missing column or null is Standard Work.
 */
export function isCaseStudy(value: unknown): boolean {
  return value === true
}

export function caseStudyHref(slug: string) {
  return `/case-studies/${slug}`
}

/**
 * Case Study media is sequenced by asset type, but the EDITOR's display order
 * decides which group comes first (groups are ordered by the first appearance of
 * any member) and the order inside each group. Nothing is mandatory: only groups
 * that have media appear.
 */
export type MediaGroupKind = 'identity' | 'web' | 'creative' | 'mockup' | 'other'

const IDENTITY = new Set(['logo', 'alternate-logo', 'identity-system', 'colour-palette', 'typography', 'stationery'])
const WEB = new Set(['website', 'storefront'])
const CREATIVE = new Set(['flyer', 'social-creative', 'campaign-graphic', 'packaging', 'brand-application'])

export function mediaGroupKind(assetType: string | undefined): MediaGroupKind {
  if (!assetType) return 'other'
  if (IDENTITY.has(assetType)) return 'identity'
  if (WEB.has(assetType)) return 'web'
  if (CREATIVE.has(assetType)) return 'creative'
  if (assetType === 'mockup') return 'mockup'
  return 'other'
}

export const MEDIA_GROUP_TITLES: Record<MediaGroupKind, string> = {
  identity: 'Brand identity',
  web: 'Website and storefront',
  creative: 'Creative and campaign',
  mockup: 'Presentation',
  other: 'More from the project',
}

export function groupMedia<T extends { creative?: { asset_type?: string } }>(items: T[]): { kind: MediaGroupKind; items: T[] }[] {
  const groups: { kind: MediaGroupKind; items: T[] }[] = []
  for (const item of items) {
    const kind = mediaGroupKind(item.creative?.asset_type)
    const existing = groups.find((g) => g.kind === kind)
    if (existing) existing.items.push(item)
    else groups.push({ kind, items: [item] })
  }
  return groups
}

/** Short context label. Client wording is reserved for exact client engagements. */
export function engagementLabel(type: EngagementType): string {
  return type === 'client' ? 'Client engagement' : 'Studio work'
}

export function statusLabel(status: ProjectStatus): string {
  return status === 'ongoing' ? 'Ongoing' : 'Completed'
}

export interface CapabilityRef {
  slug: CapabilitySlug
  name: string
  href: string
}

const CAPABILITY_NAMES = new Map<string, string>(SERVICE_GROUPS.flatMap((group) => group.capabilities.map((c) => [c.slug, c.name] as const)))

/** Unknown, duplicate or unsupported slugs are dropped; order follows the approved list. */
export function capabilityRefs(slugs: readonly unknown[]): CapabilityRef[] {
  const wanted = new Set<string>(slugs.filter(isCapabilitySlug))
  return [...CAPABILITY_NAMES.keys()]
    .filter((slug): slug is CapabilitySlug => wanted.has(slug))
    .map((slug) => ({ slug, name: CAPABILITY_NAMES.get(slug)!, href: `/services/${slug}` }))
}

/**
 * Direct video file URLs play in a native <video>. Hosted-player page URLs
 * (YouTube, Vimeo, a landing page) cannot, and are never iframed here: they are
 * offered as an external link instead. The poster is always shown.
 */
const VIDEO_FILE = /\.(mp4|webm|m4v|mov|ogv)$/i

export function videoPlayback(url: string | null | undefined): { mode: 'file' | 'link'; type?: string } | null {
  if (typeof url !== 'string' || !/^https:\/\/[^\s<>]+$/i.test(url)) return null
  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch {
    return null
  }
  const match = VIDEO_FILE.exec(pathname)
  if (!match) return { mode: 'link' }
  const ext = match[1].toLowerCase()
  return { mode: 'file', type: ext === 'webm' ? 'video/webm' : ext === 'ogv' ? 'video/ogg' : ext === 'mov' ? 'video/quicktime' : 'video/mp4' }
}
