import { validateEmail } from '@/utils/validation'

export const NEWSLETTER_CONSENT_VERSION = 'newsletter-v1'
export const NEWSLETTER_CONSENT = 'I agree to receive Hbee Digitals insights and updates by email. I can unsubscribe at any time.'
export const FOOTER_DESCRIPTION = 'Digital growth studio. Brand, experience, technology and growth — connected.'
export const SOCIAL_NETWORKS = ['LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'YouTube', 'X'] as const
export type SocialNetwork = typeof SOCIAL_NETWORKS[number]
export interface SocialProfile { platform: string; url: string; is_active: boolean; [key: string]: unknown }
export interface NewsletterSettings {
  version: 1; headline: string; description: string; popup_headline: string
  enabled: boolean; footer_enabled: boolean; popup_enabled: boolean; popup_delay_seconds: number
}
export const NEWSLETTER_DEFAULTS: NewsletterSettings = {
  version: 1, headline: 'Growth thinking, delivered occasionally.',
  description: 'Insights on brand, commerce, creative and digital growth. No noise. Just useful thinking.',
  popup_headline: 'Stay connected to what moves growth.',
  enabled: false, footer_enabled: false, popup_enabled: false, popup_delay_seconds: 240,
}

export function plainSetting(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max || /[<>\u0000-\u001f]/.test(value)) return ''
  return value.trim()
}
export function parseNewsletterSettings(raw: unknown): NewsletterSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Newsletter configuration is not available.')
  const row = raw as Record<string, unknown>
  const headline = plainSetting(row.headline, 120), description = plainSetting(row.description, 320), popup_headline = plainSetting(row.popup_headline, 120)
  if (row.version !== 1 || !headline || !description || !popup_headline || typeof row.enabled !== 'boolean' || typeof row.footer_enabled !== 'boolean' || typeof row.popup_enabled !== 'boolean'
    || typeof row.popup_delay_seconds !== 'number' || !Number.isInteger(row.popup_delay_seconds) || row.popup_delay_seconds < 180 || row.popup_delay_seconds > 300) {
    throw Error('Use plain newsletter copy, an explicit master enable switch, surface switches and a delay from 180 to 300 seconds.')
  }
  return { version: 1, headline, description, popup_headline, enabled: row.enabled, footer_enabled: row.footer_enabled, popup_enabled: row.popup_enabled, popup_delay_seconds: row.popup_delay_seconds }
}
export function readNewsletterSettings(raw: unknown): NewsletterSettings {
  try { return parseNewsletterSettings(raw) } catch { return { ...NEWSLETTER_DEFAULTS } }
}
export function newsletterCaptureEnabled(settings: NewsletterSettings, source: 'footer' | 'popup'): boolean {
  return settings.enabled === true && (source === 'footer' ? settings.footer_enabled === true : settings.popup_enabled === true)
}
export function normalizedEmail(raw: unknown, asciiOnly = false): string | null {
  if (typeof raw !== 'string') return null
  // Match PostgreSQL btrim(email)'s default ASCII-space semantics. Other
  // whitespace is rejected by validation, not silently normalized differently.
  const trimmed = raw.replace(/^ +| +$/g, '')
  // New newsletter capture does not claim SMTPUTF8/locale normalization support.
  // Historical Unicode identities are retained and resolved by PostgreSQL itself.
  if (asciiOnly && /[^\x21-\x7e]/.test(trimmed)) return null
  const email = trimmed.toLowerCase()
  return email.length <= 254 && email.split('@')[0].length <= 64 && validateEmail(email) ? email : null
}
export function networkFor(raw: unknown): SocialNetwork | undefined {
  if (typeof raw !== 'string') return undefined
  if (raw.toLowerCase() === 'twitter') return 'X'
  return SOCIAL_NETWORKS.find(network => network.toLowerCase() === raw.toLowerCase())
}
const SOCIAL_HOSTS: Record<SocialNetwork, string[]> = {
  LinkedIn: ['linkedin.com'], Instagram: ['instagram.com'], Facebook: ['facebook.com'],
  TikTok: ['tiktok.com'], YouTube: ['youtube.com', 'youtu.be'], X: ['x.com', 'twitter.com'],
}
export function socialUrl(platform: SocialNetwork, raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048 || /[\s<>\\\u0000-\u001f]/.test(raw)) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && SOCIAL_HOSTS[platform].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null
  } catch { return null }
}
export function parseSocialProfiles(raw: unknown): SocialProfile[] {
  const list: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (list == null) return []
  if (!Array.isArray(list)) throw Error('Stored social profiles must be an array.')
  if (list.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw Error('Stored social profiles contain invalid entries. Review them before saving.')
  return (list as Record<string, unknown>[])
    .map(row => ({ ...row, platform: typeof row.platform === 'string' ? row.platform : '', url: typeof row.url === 'string' ? row.url : '', is_active: row.is_active === undefined || row.is_active === true }))
}
export function publicSocialProfiles(raw: unknown) {
  try {
    return parseSocialProfiles(raw).flatMap(row => {
      const platform = networkFor(row.platform), href = platform && socialUrl(platform, row.url)
      return row.is_active && platform && href ? [{ label: platform, href }] : []
    })
  } catch { return [] }
}
/** Preserve unsupported historical entries; write only this existing JSON column. */
export function socialProfilesPayload(rows: SocialProfile[]) {
  return { social_links: rows.map(row => {
    const platform = networkFor(row.platform)
    if (!platform) return row
    const url = row.url.trim()
    if (url && !socialUrl(platform, url)) throw Error(`Use a valid HTTPS ${platform} profile URL.`)
    if (row.is_active && !url) throw Error(`Configure a ${platform} URL or disable it.`)
    return { ...row, platform, url, is_active: row.is_active }
  }), updated_at: new Date().toISOString() }
}
export function footerSitePayload(contact: string, description: string, newsletter: NewsletterSettings | undefined) {
  if (contact && !normalizedEmail(contact)) throw Error('Use a valid contact email or leave it empty.')
  if (!plainSetting(description, 400) && description !== '') throw Error('Use a plain footer description of up to 400 characters.')
  return { contact_email: contact ? normalizedEmail(contact) : null, footer_description: description.trim() || null,
    ...(newsletter ? { newsletter_settings: parseNewsletterSettings(newsletter) } : {}), updated_at: new Date().toISOString() }
}
