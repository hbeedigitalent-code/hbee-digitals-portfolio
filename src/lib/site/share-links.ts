// src/lib/site/share-links.ts
//
// Pure share logic for public Insights articles. No React, no window access at import time: every browser API is passed in, so the
// behaviour is testable and cannot run during server rendering.
//
// WHAT IS SHARED. Always the article's own public Hbee URL (an absolute https address built by the caller), never the address the
// visitor happens to be on (which may carry tracking parameters) and never a cross-post address stored as a canonical.

/** The only URLs that may be shared: absolute https addresses. Anything else is refused rather than encoded into a link. */
export function isShareableUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

/** LinkedIn's standard share endpoint. The article URL is a single, fully encoded query value. */
export function linkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

/** WhatsApp's universal share link. The message is exactly "{title} {url}", encoded once. */
export function whatsAppShareUrl(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title.trim()} ${url}`)}`
}

export interface SharePayload {
  title: string
  text: string
  url: string
}

/** What the browser's native share sheet receives. */
export function nativeSharePayload(title: string, url: string): SharePayload {
  const t = title.trim()
  return { title: t, text: t, url }
}

// ── copying ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface CopyDeps {
  clipboard?: { writeText?: (text: string) => Promise<void> } | null
  /** Legacy fallback for browsers or contexts without the async Clipboard API. Returns true when it copied. */
  legacyCopy?: ((text: string) => boolean) | null
}

/** Copy `text`. Uses the async Clipboard API; falls back to a legacy copy; never throws. */
export async function copyText(text: string, deps: CopyDeps): Promise<boolean> {
  try {
    if (deps.clipboard && typeof deps.clipboard.writeText === 'function') {
      await deps.clipboard.writeText(text)
      return true
    }
  } catch {
    /* permission denied or insecure context: try the legacy path */
  }
  try {
    return deps.legacyCopy ? deps.legacyCopy(text) === true : false
  } catch {
    return false
  }
}

// ── native share, with a copy fallback ───────────────────────────────────────────────────────────────────────────────────
export interface ShareDeps extends CopyDeps {
  share?: ((data: SharePayload) => Promise<void>) | null
  canShare?: ((data: SharePayload) => boolean) | null
}

/** shared: the native sheet completed · cancelled: the visitor dismissed it (nothing to report) · copied: fell back to copy · failed */
export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed'

/**
 * Share through the Web Share API when the browser has it; otherwise (or if it refuses the data) copy the URL instead.
 * A visitor dismissing the sheet is not an error and does not trigger the copy fallback.
 */
export async function shareOrCopy(title: string, url: string, deps: ShareDeps): Promise<ShareOutcome> {
  const payload = nativeSharePayload(title, url)
  if (typeof deps.share === 'function') {
    let allowed = true
    try {
      if (typeof deps.canShare === 'function') allowed = deps.canShare(payload) !== false
    } catch {
      allowed = true
    }
    if (allowed) {
      try {
        await deps.share(payload)
        return 'shared'
      } catch (error) {
        if (error && typeof error === 'object' && (error as { name?: unknown }).name === 'AbortError') return 'cancelled'
        /* any other failure: fall back to copying the link */
      }
    }
  }
  return (await copyText(url, deps)) ? 'copied' : 'failed'
}
