// src/lib/admin/assessment-answers.ts
//
// SERVER-SIDE presentation model for a merchant's stored assessment answers,
// for the authenticated admin review screen only (Phase 16.2).
//
// raw_answers_json is historical stored input. It is NOT trusted UI structure:
// older rows can lack newer keys, newer rows omit the optional answers, and a
// value's type cannot be assumed. So nothing here iterates the stored object.
// A fixed allow-list of known keys is read, each value is coerced to the shape
// its label expects, and anything blank, malformed or unknown is simply left
// out. The browser receives labelled, bounded strings — never the JSON itself.
//
// This is VISIBILITY ONLY. Values are shown as the merchant gave them: nothing
// is scored, summarised, interpreted or ranked. `emphasis` is a fixed display
// hint for the answers reviewers lean on most, not a judgement about the
// answer.

export type AnswerKind = 'text' | 'long' | 'list' | 'scale' | 'url' | 'email'

export interface AssessmentAnswerItem {
  key: string
  label: string
  kind: AnswerKind
  /** A string, or the chosen options for a multi-select. Never empty. */
  value: string | string[]
  /** Fixed visual emphasis for the core diagnostic answers. */
  emphasis?: boolean
  /** Short factual context, e.g. that a submitted value differs from the merchant record. */
  note?: string
}

export interface AssessmentAnswerSection {
  id: string
  title: string
  items: AssessmentAnswerItem[]
}

type Coerce = 'string' | 'long' | 'list' | 'scale' | 'url' | 'email'

interface FieldSpec {
  key: string
  label: string
  coerce: Coerce
  emphasis?: boolean
}

const SECTIONS: { id: string; title: string; fields: FieldSpec[] }[] = [
  {
    id: 'business',
    title: 'Business',
    fields: [
      { key: 'business_name', label: 'Business name', coerce: 'string' },
      { key: 'website', label: 'Website', coerce: 'url' },
      { key: 'contact_name', label: 'Contact name', coerce: 'string' },
      { key: 'email', label: 'Email', coerce: 'email' },
      { key: 'country', label: 'Country', coerce: 'string' },
      { key: 'industry', label: 'Industry', coerce: 'string' },
      { key: 'business_stage', label: 'Business stage', coerce: 'string', emphasis: true },
      { key: 'store_age', label: 'Store age', coerce: 'string' },
    ],
  },
  {
    id: 'goals',
    title: 'Goals',
    fields: [
      { key: 'primary_goals', label: '90-day goals', coerce: 'list', emphasis: true },
      { key: 'success_vision', label: 'What success looks like', coerce: 'long' },
    ],
  },
  {
    id: 'visibility',
    title: 'Visibility & marketing',
    fields: [
      { key: 'marketing_channels', label: 'How customers discover them', coerce: 'list', emphasis: true },
      { key: 'best_channel', label: 'Best performing channel', coerce: 'string' },
      { key: 'paid_ads_usage', label: 'Paid advertising', coerce: 'string' },
      { key: 'paid_ad_platforms', label: 'Paid platforms', coerce: 'list' },
      { key: 'visibility_confidence', label: 'Confidence in current visibility', coerce: 'scale' },
      { key: 'content_publishing', label: 'Content publishing', coerce: 'string' },
    ],
  },
  {
    id: 'customer',
    title: 'Customer experience',
    fields: [
      { key: 'email_capture', label: 'Email capture', coerce: 'string' },
      { key: 'email_automations', label: 'Email automations', coerce: 'string' },
      { key: 'customer_reviews', label: 'Customer reviews', coerce: 'string' },
      { key: 'upsells_crosssells', label: 'Upsells / cross-sells', coerce: 'string' },
    ],
  },
  {
    id: 'challenge',
    title: 'Challenge',
    fields: [
      { key: 'biggest_challenge', label: 'Biggest growth challenge', coerce: 'long', emphasis: true },
      { key: 'main_obstacle', label: 'Main obstacle', coerce: 'long' },
    ],
  },
  {
    id: 'priority',
    title: 'Priority',
    fields: [
      { key: 'support_type', label: 'Support wanted', coerce: 'string', emphasis: true },
      { key: 'improvement_timeline', label: 'Improvement timeline', coerce: 'string', emphasis: true },
    ],
  },
]

const MAX_SHORT = 300
const MAX_LONG = 4000
const MAX_LIST_ITEMS = 25
const MAX_LIST_ITEM = 200

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

function bound(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}

/** A stored scalar as display text, or null when there is nothing meaningful to show. */
function scalarText(raw: unknown, max: number, multiline: boolean): string | null {
  let text: string
  if (typeof raw === 'string') text = raw
  else if (typeof raw === 'number' && Number.isFinite(raw)) text = String(raw)
  else if (typeof raw === 'boolean') text = raw ? 'Yes' : 'No'
  else return null

  text = text.replace(CONTROL, '').replace(/\r\n?/g, '\n')
  text = multiline ? text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : text.replace(/\s+/g, ' ').trim()
  return text ? bound(text, max) : null
}

function listValue(raw: unknown): string[] | null {
  const source = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : null
  if (!source) return null
  const out: string[] = []
  for (const item of source) {
    const text = scalarText(item, MAX_LIST_ITEM, false)
    if (text && !out.includes(text)) out.push(text)
    if (out.length >= MAX_LIST_ITEMS) break
  }
  return out.length ? out : null
}

function httpUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function itemFor(spec: FieldSpec, raw: unknown): AssessmentAnswerItem | null {
  const base = { key: spec.key, label: spec.label, ...(spec.emphasis ? { emphasis: true } : {}) }
  switch (spec.coerce) {
    case 'list': {
      const value = listValue(raw)
      return value ? { ...base, kind: 'list', value } : null
    }
    case 'long': {
      const value = scalarText(raw, MAX_LONG, true)
      return value ? { ...base, kind: 'long', value } : null
    }
    case 'scale': {
      const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() ? Number(raw) : NaN
      if (!Number.isFinite(n) || n < 1 || n > 10) return null
      return { ...base, kind: 'scale', value: `${Math.round(n)} / 10` }
    }
    case 'url': {
      const value = scalarText(raw, MAX_SHORT, false)
      if (!value) return null
      // Rendered as a link only when it is a genuine http(s) URL.
      return { ...base, kind: httpUrl(value) ? 'url' : 'text', value }
    }
    case 'email': {
      const value = scalarText(raw, MAX_SHORT, false)
      return value ? { ...base, kind: 'email', value } : null
    }
    default: {
      const value = scalarText(raw, MAX_SHORT, false)
      return value ? { ...base, kind: 'text', value } : null
    }
  }
}

/** The merchant record as the review screen already shows it. */
export interface MerchantRecord {
  business_name?: unknown
  website?: unknown
  email?: unknown
  country?: unknown
  industry?: unknown
}

// The review screen's "Merchant record" card already shows these five values.
// The answer is repeated only when what was SUBMITTED differs from the record —
// e.g. a resubmission under an existing email with a different business name.
const RECORD_FIELDS = ['business_name', 'website', 'email', 'country', 'industry'] as const

function comparable(key: string, value: unknown): string {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return key === 'website' ? text.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '') : text
}

/**
 * Build the review screen's answer sections from a stored assessment row's
 * raw_answers_json. Never throws; a missing or malformed blob yields [].
 */
export function buildAssessmentAnswers(rawAnswers: unknown, merchant?: MerchantRecord | null): AssessmentAnswerSection[] {
  if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) return []
  const answers = rawAnswers as Record<string, unknown>

  const sections: AssessmentAnswerSection[] = []
  for (const section of SECTIONS) {
    const items: AssessmentAnswerItem[] = []
    for (const spec of section.fields) {
      const item = itemFor(spec, answers[spec.key])
      if (!item) continue

      if (merchant && (RECORD_FIELDS as readonly string[]).includes(spec.key)) {
        const recorded = (merchant as Record<string, unknown>)[spec.key]
        if (comparable(spec.key, recorded) === comparable(spec.key, item.value)) continue
        if (typeof recorded === 'string' && recorded.trim()) item.note = 'Differs from the merchant record'
      }
      items.push(item)
    }
    if (items.length) sections.push({ id: section.id, title: section.title, items })
  }
  return sections
}
