/**
 * Video accessibility metadata. It belongs to the ASSET (media_assets.captions_url / transcript), because the same video
 * has the same speech wherever it is placed. Both are optional: many creative clips contain no meaningful speech. Nothing
 * is ever generated. Pure and safe on both sides; mirrors the checks in scripts/admin-media-placement-01-forward.sql.
 */
export const CAPTIONS_URL_MAX = 2048
export const TRANSCRIPT_MAX = 20000

/** An HTTPS WebVTT file: no credentials, whitespace, quotes or backslashes, path ending in .vtt. */
export function isCaptionsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > CAPTIONS_URL_MAX || /[\s<>"'\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && /\.vtt$/i.test(url.pathname) && /^https:\/\/[^?#]+\.vtt([?#].*)?$/i.test(value)
  } catch { return false }
}

export interface VideoAccessibility { captions_url: string | null; transcript: string | null }

/** Trimmed values ready to store (blank becomes null), or the reason they cannot be. The transcript is plain text. */
export function cleanAccessibility(input: { captions_url: string; transcript: string }): { value: VideoAccessibility } | { error: string } {
  const captions = input.captions_url.trim()
  const transcript = input.transcript.replace(/\r\n?/g, '\n').trim()
  if (captions && !isCaptionsUrl(captions)) return { error: 'The captions link must be an HTTPS address of a WebVTT file ending in .vtt, without spaces.' }
  if (transcript.length > TRANSCRIPT_MAX) return { error: `Keep the transcript to ${TRANSCRIPT_MAX.toLocaleString('en-US')} characters or fewer.` }
  return { value: { captions_url: captions || null, transcript: transcript || null } }
}
