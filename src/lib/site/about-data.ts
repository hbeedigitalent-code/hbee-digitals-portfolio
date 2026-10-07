/**
 * Server-side data adapter for the rebuilt About page.
 *
 *   raw team_members / about_page rows  →  AboutData (safe, truthful)  →  components
 *
 * - Server only. Same access path as the other rebuild loaders: the anonymous
 *   public client, `is_active = true`, RLS applies. No service-role key, no
 *   admin loaders, no writes. These are the same tables (and the same storage
 *   rule) the live /about page already reads.
 * - Nothing is inferred. A person is rendered only with what the CMS holds:
 *   name, the role the editor entered (`position`), their portrait, their
 *   bio, and a LinkedIn URL. No "Founder" label is ever added — the first
 *   person in the editor's display order receives the larger profile, with
 *   their own entered role. `about_stats` is deliberately NOT read: counters
 *   are not rendered until the owner verifies them.
 * - Never throws. A failed read returns an empty team / no image.
 *
 * buildAboutData is pure and exported so the same path can be exercised in
 * tests with raw rows.
 */

import { supabase } from '@/lib/supabase'
import { imageUrl, text, truncate, type Row } from './home-data'

if (typeof window !== 'undefined') {
  throw new Error('src/lib/site/about-data.ts is server-only')
}

export interface TeamMember {
  id: string
  name: string
  /** The role exactly as the editor entered it (`position`). */
  role?: string
  bio?: string
  portrait?: { src: string; alt: string }
  linkedin?: string
}

export interface AboutData {
  /** Active team members in the editor's display order. [0] is the lead profile. */
  team: TeamMember[]
  /** The About image the editor set in the CMS (`about_page.about_image`). */
  purposeImage?: string
}

/* Same bucket and folder rule as the live TeamSection / About page: a bare
   storage path resolves to the public URL in `project-images` (team photos
   under `team/`). Full URLs and site-relative paths pass through imageUrl. */
const BUCKET = 'project-images'

function storageUrl(value: unknown, folder?: string): string | undefined {
  const direct = imageUrl(value)
  if (direct) return direct
  const v = text(value)?.replace(/^\/+/, '')
  if (!v || /\s/.test(v) || v.includes('://')) return undefined
  const path = folder && !v.startsWith(`${folder}/`) ? `${folder}/${v}` : v
  return imageUrl(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
}

function portraitOf(row: Row) {
  return storageUrl(row.image_url, 'team') ?? storageUrl(row.photo_url, 'team') ?? storageUrl(row.avatar_url, 'team')
}

/** LinkedIn only, https only — never a guessed or constructed profile. */
function linkedinOf(value: unknown): string | undefined {
  const v = text(value)
  if (!v || !/^https:\/\/[^\s]+$/i.test(v)) return undefined
  try {
    const host = new URL(v).hostname.toLowerCase()
    return host === 'linkedin.com' || host.endsWith('.linkedin.com') ? v : undefined
  } catch {
    return undefined
  }
}

export function toTeamMember(row: Row, index: number): TeamMember | null {
  const name = text(row.name)
  if (!name) return null
  const src = portraitOf(row)
  return {
    id: text(row.id) ?? `member-${index}`,
    name,
    role: text(row.position) ?? text(row.role),
    bio: truncate(text(row.bio), 320),
    portrait: src ? { src, alt: `Portrait of ${name}` } : undefined,
    linkedin: linkedinOf(row.social_linkedin),
  }
}

export function buildAboutData(teamRows: Row[] | null | undefined, aboutRow?: Row | null): AboutData {
  const rows = (teamRows ?? [])
    .filter((r) => r && r.is_active !== false)
    .map((r, i) => ({ r, i, order: typeof r.display_order === 'number' ? r.display_order : Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.order - b.order || a.i - b.i)

  const team = rows.map(({ r, i }) => toTeamMember(r, i)).filter((m): m is TeamMember => Boolean(m))
  return { team, purposeImage: aboutRow ? storageUrl(aboutRow.about_image) : undefined }
}

const TEAM_FIELDS = 'id, name, position, bio, image_url, social_linkedin, display_order, is_active'

export async function getAboutData(): Promise<AboutData> {
  try {
    const [teamRes, aboutRes] = await Promise.all([
      supabase.from('team_members').select(TEAM_FIELDS).eq('is_active', true).order('display_order', { ascending: true }),
      supabase.from('about_page').select('about_image').eq('is_active', true).limit(1).maybeSingle(),
    ])
    return buildAboutData(teamRes.error ? [] : (teamRes.data as Row[]), aboutRes.error ? null : (aboutRes.data as Row | null))
  } catch {
    return { team: [] }
  }
}
