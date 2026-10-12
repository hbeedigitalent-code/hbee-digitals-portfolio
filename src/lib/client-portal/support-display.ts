// src/lib/client-portal/support-display.ts
//
// Pure helpers for the Client Portal supporting pages (Phase 18.7): Requests, Invoices,
// Settings and Notifications. No I/O. Everything formats or validates values the portal already
// stores; nothing here invents a status, a field or a capability.

import { safePortalLink } from './dashboard'

/** Humanise a STORED status for display only (underscores to spaces, first letter capital). */
export function humanStatus(status: string | null | undefined): string | null {
  const t = (status || '').replace(/[_-]+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : null
}

export function formatDay(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Money in the invoice's own currency; null when there is no real amount (never "$0"/"$undefined"). */
export function formatAmount(amount: unknown, currency: string | null | undefined): string | null {
  if (amount === null || amount === undefined || amount === '') return null
  const n = Number(amount)
  if (!Number.isFinite(n)) return null
  const code = (currency || 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(n)
  } catch {
    return `${code} ${n.toLocaleString()}`
  }
}

/** An https URL (no embedded credentials) or null. Used for any external link a server hands out. */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw || raw.length > 2000) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:' || u.username || u.password) return null
    return u.toString()
  } catch {
    return null
  }
}

/** Notification link -> a same-origin portal path or null (the shared dashboard rule). */
export const safeNotificationLink = safePortalLink

// ── Settings validation ─────────────────────────────────────────────

export interface SettingsPatch {
  full_name?: string
  business_name?: string
  whatsapp?: string
  website_url?: string
  country?: string
  email_notifications?: boolean
  project_updates?: boolean
  marketing_emails?: boolean
}

const TEXT_LIMITS = { full_name: 120, business_name: 160, whatsapp: 40, website_url: 300, country: 80 } as const
const PHONE_RE = /^[0-9+()\-\s.]*$/

/** Add https:// when a website was typed without a scheme; validate it; '' stays '' (cleared). */
export function normalizeWebsite(value: string): string | null {
  const v = value.trim()
  if (v === '') return ''
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (u.username || u.password) return null
    if (!u.hostname.includes('.')) return null
    const out = u.toString()
    return out.length <= TEXT_LIMITS.website_url ? out : null
  } catch {
    return null
  }
}

/**
 * Validate a settings update against the fields the portal already lets a client edit. Unknown
 * keys are ignored (never written). Returns the clean update, or the first error.
 */
export function validateSettingsPatch(
  body: unknown,
): { ok: true; patch: SettingsPatch } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request.' }
  const b = body as Record<string, unknown>
  const patch: SettingsPatch = {}

  for (const key of ['full_name', 'business_name', 'whatsapp', 'country'] as const) {
    if (b[key] === undefined) continue
    if (typeof b[key] !== 'string') return { ok: false, error: 'Invalid request.' }
    const v = (b[key] as string).trim()
    if (v.length > TEXT_LIMITS[key]) return { ok: false, error: 'One of the fields is too long.' }
    if (key === 'whatsapp' && !PHONE_RE.test(v)) return { ok: false, error: 'Please enter a valid WhatsApp number.' }
    patch[key] = v
  }

  if (b.website_url !== undefined) {
    if (typeof b.website_url !== 'string') return { ok: false, error: 'Invalid request.' }
    const w = normalizeWebsite(b.website_url)
    if (w === null) return { ok: false, error: 'Please enter a valid website address.' }
    patch.website_url = w
  }

  for (const key of ['email_notifications', 'project_updates', 'marketing_emails'] as const) {
    if (b[key] === undefined) continue
    if (typeof b[key] !== 'boolean') return { ok: false, error: 'Invalid request.' }
    patch[key] = b[key] as boolean
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to update.' }
  return { ok: true, patch }
}

/**
 * An avatar URL may only be one of THIS user's own uploads in the client-portal bucket. The
 * upload itself is still the existing browser upload; this stops the profile pointing anywhere else.
 */
export function isOwnAvatarUrl(url: unknown, userId: string, supabaseUrl: string | undefined): boolean {
  if (typeof url !== 'string' || !supabaseUrl || !userId) return false
  const base = supabaseUrl.replace(/\/+$/, '')
  const prefix = `${base}/storage/v1/object/public/client-portal/profile-images/${userId}-`
  if (!url.startsWith(prefix) || url.length > 500) return false
  const rest = url.slice(prefix.length)
  return !rest.includes('..') && !rest.includes('\\') && !/[\s?#]/.test(rest)
}
