/** Canonical testimonial source: testimonials. Legacy trust JSON is not merged. */
export type TestimonialRow = Record<string, unknown> & { id: string }
export interface ProofQuote { id: string; quote: string; name: string; role?: string; company?: string; avatar?: string }
export interface TestimonialForm {
  name: string; position: string; company: string; content: string; image_url: string; display_order: string; is_active: boolean
}

function string(value: unknown) { return typeof value === 'string' ? value : '' }
function primary(row: Record<string, unknown>, key: string, legacy: string) {
  // An explicitly empty canonical value clears the field; it must not resurrect legacy data.
  return typeof row[key] === 'string' ? row[key] as string : string(row[legacy])
}
export function testimonialImageUrl(value: unknown): string | undefined {
  const url = string(value).trim()
  if (!url || /[\s<>\\\u0000-\u001f]/.test(url)) return undefined
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? url : undefined }
  catch { return undefined }
}
export function testimonialForm(row?: Record<string, unknown>): TestimonialForm {
  return row ? { name: string(row.name), position: primary(row, 'position', 'role'), company: string(row.company), content: string(row.content),
    image_url: primary(row, 'image_url', 'avatar_url'), display_order: String(row.display_order ?? 0), is_active: row.is_active === true }
    : { name: '', position: '', company: '', content: '', image_url: '', display_order: '0', is_active: false }
}
export function testimonialQuote(row: Record<string, unknown>, preview = false): ProofQuote | null {
  if (!preview && row.is_active !== true) return null
  const name = string(row.name), quote = string(row.content)
  if (!name.trim() || !quote.trim()) return null
  return { id: String(row.id ?? 'preview'), name, quote, role: primary(row, 'position', 'role') || undefined,
    company: string(row.company) || undefined, avatar: testimonialImageUrl(primary(row, 'image_url', 'avatar_url')) }
}
export function testimonialPayload(form: TestimonialForm) {
  if (!form.name.trim() || !form.content.trim()) throw new Error('Name and testimonial quote are required.')
  if (!/^-?\d+$/.test(form.display_order.trim()) || !Number.isSafeInteger(Number(form.display_order))) throw new Error('Display order must be a whole number.')
  if (form.image_url.trim() && !testimonialImageUrl(form.image_url)) throw new Error('Use an HTTPS image URL or a local image path.')
  // Rating, featured, legacy attribution, provenance, and relationship fields stay untouched.
  // Preserve the submitted quote verbatim: no polishing, HTML interpretation, or truncation.
  return { name: form.name, position: form.position, company: form.company, content: form.content,
    image_url: form.image_url, display_order: Number(form.display_order), is_active: form.is_active }
}
