import { supabase } from '@/lib/supabase'

/**
 * site_settings holds ONE canonical record, identified by
 * `settings_key = 'site'` (UNIQUE + CHECK in the database; see
 * scripts/seo-03-site-settings-canonical.sql). Every reader and the admin save
 * go through this key, so a save can never create a second row.
 *
 * Until that migration has run the column does not exist: reads then return no
 * row and every caller keeps its built-in defaults, exactly as before.
 */
export const SITE_SETTINGS_KEY = 'site'

export function fetchSiteSettings() {
  return supabase
    .from('site_settings')
    .select('*')
    .eq('settings_key', SITE_SETTINGS_KEY)
    .maybeSingle()
}

/** The admin Settings form's fields. */
export interface SiteSettingsForm {
  site_name: string
  logo_url: string
  favicon_url: string
  contact_email: string
  contact_phone: string
  contact_address: string
  footer_description: string
  google_analytics_id: string
  meta_description: string
  meta_keywords: string
  facebook_url: string
  twitter_url: string
  instagram_url: string
  linkedin_url: string
}

const FORM_FIELDS: (keyof SiteSettingsForm)[] = [
  'site_name', 'logo_url', 'favicon_url', 'contact_email', 'contact_phone',
  'contact_address', 'footer_description', 'google_analytics_id',
  'meta_description', 'meta_keywords', 'facebook_url', 'twitter_url',
  'instagram_url', 'linkedin_url',
]

/**
 * Form field -> database column, where the names differ. The social and
 * meta-description fields map onto the table's existing columns rather than
 * duplicating them.
 */
const FORM_TO_COLUMN: Partial<Record<keyof SiteSettingsForm, string>> = {
  meta_description: 'site_description',
  facebook_url: 'social_facebook',
  twitter_url: 'social_twitter',
  instagram_url: 'social_instagram',
  linkedin_url: 'social_linkedin',
}

function columnFor(field: keyof SiteSettingsForm) {
  return FORM_TO_COLUMN[field] ?? field
}

/** Overlay a database row onto form defaults; NULL columns keep the default. */
export function rowToForm(row: Record<string, unknown> | null, defaults: SiteSettingsForm): SiteSettingsForm {
  const form = { ...defaults }
  if (!row) return form
  for (const field of FORM_FIELDS) {
    const value = row[columnFor(field)]
    if (typeof value === 'string') form[field] = value
  }
  return form
}

/**
 * The payload for upserting the canonical record: only real columns, never an
 * `id`, always the fixed key.
 */
export function formToRow(form: SiteSettingsForm) {
  const row: Record<string, string> = {}
  for (const field of FORM_FIELDS) {
    row[columnFor(field)] = form[field]
  }
  return { ...row, settings_key: SITE_SETTINGS_KEY, updated_at: new Date().toISOString() }
}
