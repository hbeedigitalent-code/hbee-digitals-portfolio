/**
 * Blog HTML Cleaning Utilities
 * 
 * These functions clean raw HTML content from the admin editor
 * so it renders properly on the public blog pages.
 */

export function decodeHtml(value: string): string {
  if (typeof window === 'undefined') return value

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

export function cleanBlogHtml(raw: string): string {
  if (!raw) return '<p>Content coming soon...</p>'

  let html = raw.trim()

  // Remove markdown code fences
  html = html
    .replace(/^```html/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim()

  // Decode HTML entities if present
  if (html.includes('&lt;') || html.includes('&gt;')) {
    html = decodeHtml(html)
  }

  // Remove problematic elements that cause code-style rendering
  html = html
    .replace(/<pre[^>]*>/gi, '')
    .replace(/<\/pre>/gi, '')
    .replace(/<code[^>]*>/gi, '')
    .replace(/<\/code>/gi, '')
    .replace(/<article[^>]*>/gi, '')
    .replace(/<\/article>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<section[^>]*>/gi, '')
    .replace(/<\/section>/gi, '')
    .replace(/<p[^>]*>\s*\.\.\.\s*<\/p>/gi, '')
    .replace(/^\s*\.\.\.\s*$/gm, '')
    .replace(/\s*\.\.\.\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return html
}

/**
 * Generate table of contents from HTML content
 * Extracts h2 and h3 elements
 */
export function generateToc(html: string): Array<{ id: string; text: string; level: number }> {
  if (!html) return []

  const toc: Array<{ id: string; text: string; level: number }> = []
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi
  let match

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10)
    // Strip any HTML tags from the heading text
    const text = match[2].replace(/<[^>]+>/g, '').trim()
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60)

    toc.push({ id, text, level })
  }

  return toc
}

/**
 * Auto-estimate read time from HTML content
 * Average reading speed: 200 words per minute
 */
export function estimateReadTime(html: string): string {
  if (!html) return '3 min'

  // Strip HTML tags to count words
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = text.split(' ').filter((word) => word.length > 0).length
  const minutes = Math.ceil(wordCount / 200)

  return `${minutes} min read`
}

/**
 * Ensure a slug is URL-friendly
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Absolute URL helper for OG images
 */
export function absoluteUrl(path?: string | null): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'

  if (!path) return `${siteUrl}/og-default.jpg`
  if (path.startsWith('http')) return path
  return `${siteUrl}${path}`
}