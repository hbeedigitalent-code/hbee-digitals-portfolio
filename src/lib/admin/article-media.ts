import { isHttpsUrl } from '@/lib/media/media-validation'

/** Escape text for use inside HTML text nodes AND double-quoted attribute values. */
export function escapeHtml(value: string): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export interface ArticleImageInput {
  src: string
  alt: string
  decorative?: boolean
  caption?: string
  width?: number | null
  height?: number | null
}

const dimension = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 20000 ? value : null

export class ArticleMediaError extends Error {}

/**
 * Markup for one inline article image: <figure><img …/><figcaption>…</figcaption></figure>.
 * Built only from escaped text and a validated HTTPS URL, using tags and attributes the public sanitizer already allows
 * (figure, img src/alt/width/height/loading, figcaption). No script, style, event handler or non-HTTPS URL can be produced.
 */
export function buildArticleFigureHtml(input: ArticleImageInput): string {
  if (!isHttpsUrl(input.src)) throw new ArticleMediaError('Only HTTPS images from the Media Library can be inserted.')
  const alt = input.decorative ? '' : String(input.alt ?? '').trim()
  if (!input.decorative && !alt) throw new ArticleMediaError('Add alt text for the image, or mark it as decorative.')
  if (alt.length > 300) throw new ArticleMediaError('Keep alt text to 300 characters or fewer.')
  const caption = String(input.caption ?? '').replace(/\s+/g, ' ').trim()
  if (caption.length > 500) throw new ArticleMediaError('Keep the caption to 500 characters or fewer.')
  const width = dimension(input.width), height = dimension(input.height)
  const size = width && height ? ` width="${width}" height="${height}"` : ''
  const lines = ['<figure>', `  <img src="${escapeHtml(input.src)}" alt="${escapeHtml(alt)}"${size} loading="lazy" />`]
  if (caption) lines.push(`  <figcaption>${escapeHtml(caption)}</figcaption>`)
  lines.push('</figure>')
  return lines.join('\n')
}

/**
 * Insert a block of HTML into the article text. `start`/`end` are the textarea selection; when they are missing or
 * out of range the block goes at the end. The block is separated from neighbouring content by blank lines and nothing
 * else in the article is changed.
 */
export function insertHtmlBlock(content: string, snippet: string, selection?: { start: number; end: number } | null) {
  const valid = !!selection && Number.isInteger(selection.start) && Number.isInteger(selection.end)
    && selection.start >= 0 && selection.end >= selection.start && selection.end <= content.length
  const start = valid ? selection!.start : content.length
  const end = valid ? selection!.end : content.length
  const before = content.slice(0, start), after = content.slice(end)
  const lead = before === '' || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const trail = after === '' ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const inserted = `${lead}${snippet}${trail}`
  return { content: `${before}${inserted}${after}`, caret: before.length + inserted.length, atCursor: valid }
}
