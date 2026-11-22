// src/lib/site/social-image.ts
//
// Pure. The one place that decides what a public Hbee URL declares as its social-preview (Open Graph / Twitter) image.
//
// THE RULES THIS ENFORCES
//   * Every declared image is a real 1200 × 630 raster at an absolute https URL, and its declared width, height and type are TRUE.
//     (The previous system declared 1200×630 for a 3264×1713 JPEG and for portrait 1080×1350 PNGs, and pointed link previews at
//     multi-megabyte CMS images, which WhatsApp and others commonly refuse to show.)
//   * Pages without special artwork inherit the static Hbee default.
//   * Articles and projects get a generated card (title + Hbee identity), never their raw featured image, whatever its ratio.
//   * A card URL carries a short content version, so an edited title produces a new URL instead of a stale cached preview.

import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/blog-utils'

export const SOCIAL_IMAGE_WIDTH = 1200
export const SOCIAL_IMAGE_HEIGHT = 630

/** The static default. Regenerate with scripts/build-og-default.cjs. */
export const DEFAULT_SOCIAL_IMAGE_PATH = DEFAULT_OG_IMAGE
export const DEFAULT_SOCIAL_IMAGE_ALT = 'Hbee Digitals — Digital Growth Studio. Growth works better when everything connects.'

export interface SocialImage {
  url: string
  width: number
  height: number
  type: string
  alt: string
}

export function defaultSocialImage(alt: string = DEFAULT_SOCIAL_IMAGE_ALT): SocialImage {
  return { url: `${SITE_URL}${DEFAULT_SOCIAL_IMAGE_PATH}`, width: SOCIAL_IMAGE_WIDTH, height: SOCIAL_IMAGE_HEIGHT, type: 'image/jpeg', alt }
}

// ── generated cards ──────────────────────────────────────────────────────────────────────────────────────────────────────
export type CardKind = 'insights' | 'work'
export const CARD_KINDS: readonly CardKind[] = ['insights', 'work']
/** Bump when the card design (og-card.tsx) changes, so previously cached cards are not reused. */
export const CARD_DESIGN_VERSION = 'card-1'
export const CARD_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isCardKind(value: unknown): value is CardKind {
  return typeof value === 'string' && (CARD_KINDS as readonly string[]).includes(value)
}

/** A short, stable content hash (FNV-1a, 8 hex chars) used only to version a card URL. Not a security function. */
export function cardVersion(...parts: Array<string | null | undefined>): string {
  let h = 0x811c9dc5
  for (const ch of parts.map((p) => p ?? '').join('\u0001')) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** The generated card for an article or project: an absolute https URL to a real 1200×630 PNG. */
export function generatedSocialImage(kind: CardKind, slug: string, alt: string, versionParts: Array<string | null | undefined> = []): SocialImage {
  const v = cardVersion(CARD_DESIGN_VERSION, kind, slug, ...versionParts)
  return { url: `${SITE_URL}/og/${kind}/${slug}?v=${v}`, width: SOCIAL_IMAGE_WIDTH, height: SOCIAL_IMAGE_HEIGHT, type: 'image/png', alt }
}

// ── title fitting (so a card never overflows) ─────────────────────────────────────────────────────────────────────────────
export interface FittedTitle {
  text: string
  fontSize: number
}

const MAX_TITLE_CHARS = 100

/**
 * Collapse whitespace and keep only characters the card fonts actually contain (Latin, Latin Extended, combining marks, general
 * punctuation, the euro sign). Anything else (emoji, symbols, other scripts) is dropped: the renderer would otherwise draw a
 * missing-glyph box or try to fetch an emoji image over the network.
 */
export function cleanCardText(value: unknown): string {
  return String(value ?? '')
    .replace(/[^ -ɏ̀-ͯḀ-ỿ‐-‧‰-⁞€]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Size by length, then truncate at a word boundary with an ellipsis. The card is 880px wide for the title; these sizes keep it within four lines. */
export function fitCardTitle(raw: unknown): FittedTitle {
  let text = cleanCardText(raw)
  if (!text) text = 'Hbee Digitals'
  if (text.length > MAX_TITLE_CHARS) {
    const cut = text.slice(0, MAX_TITLE_CHARS - 1)
    const lastSpace = cut.lastIndexOf(' ')
    text = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…'
  }
  const fontSize = text.length <= 40 ? 76 : text.length <= 70 ? 64 : 56
  return { text, fontSize }
}
