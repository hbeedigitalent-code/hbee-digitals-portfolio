/** Existing portfolio_items fields only. No public capability attribution. */
export type PortfolioEditor = {
  title: string
  slug: string
  client_name: string
  category: string
  industry: string
  project_type: string
  description: string
  brief: string
  challenge: string
  solution: string
  results_summary: string
  results: string
  technologies_used: string[]
  website_url: string
  image_url: string
  gallery_images: string[]
  before_image: string
  after_image: string
  metric_label: string
  metric_value: string
  featured: boolean
  is_active: boolean
  is_before_after: boolean
  display_order: number
  seo_title: string
  seo_description: string
}

export const EMPTY_PORTFOLIO: PortfolioEditor = {
  title: '', slug: '', client_name: '', category: '', industry: '', project_type: '',
  description: '', brief: '', challenge: '', solution: '', results_summary: '', results: '',
  technologies_used: [], website_url: '', image_url: '', gallery_images: [],
  before_image: '', after_image: '', metric_label: '', metric_value: '',
  featured: false, is_active: false, is_before_after: false, display_order: 0,
  seo_title: '', seo_description: '',
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

export function validWorkSlug(value: string) {
  return /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/.test(value) && value !== 'portfolio'
}

export const portfolioEditHref = (id: string) => `/admin/portfolio/${encodeURIComponent(id)}`
export const portfolioPublicHref = (slug: string) => `/work/${slug}`

/** Match the public image model: HTTPS URLs or local, root-relative paths. */
export function validPortfolioImage(value: string) {
  if (!value || /[\s<>"'\\]/.test(value)) return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch { return false }
}

export function validPortfolioWebsite(value: string) {
  if (!value) return true
  return /^https:\/\//i.test(value) && validPortfolioImage(value)
}

function stringArray(value: unknown, label: string): string[] {
  if (value == null || value === '') return []
  let parsed = value
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { throw new Error(`${label} has invalid stored JSON. No changes have been saved.`) }
  }
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new Error(`${label} must contain an array of strings. No changes have been saved.`)
  }
  return [...parsed]
}

export function loadPortfolioEditor(row: Record<string, unknown>): PortfolioEditor {
  const form = { ...EMPTY_PORTFOLIO }
  for (const key of Object.keys(EMPTY_PORTFOLIO) as (keyof PortfolioEditor)[]) {
    if (typeof EMPTY_PORTFOLIO[key] === 'string') {
      Object.assign(form, { [key]: typeof row[key] === 'string' ? row[key] : '' })
    }
  }
  form.title = form.title || (typeof row.name === 'string' ? row.name : '') || form.client_name
  form.gallery_images = stringArray(row.gallery_images, 'Gallery images')
  form.technologies_used = stringArray(row.technologies_used, 'Technologies')
  form.featured = Boolean(row.featured)
  form.is_active = row.is_active == null ? true : Boolean(row.is_active)
  form.is_before_after = Boolean(row.is_before_after)
  form.display_order = typeof row.display_order === 'number' ? row.display_order : 0
  return form
}

export type PortfolioErrors = Partial<Record<keyof PortfolioEditor, string>>

export function validatePortfolio(form: PortfolioEditor): PortfolioErrors {
  const errors: PortfolioErrors = {}
  if (!form.title.trim()) errors.title = 'Enter a project title.'
  if (!validWorkSlug(form.slug)) errors.slug = 'Use lowercase letters, numbers, underscores and single hyphens. “portfolio” is reserved.'
  if (!validPortfolioWebsite(form.website_url)) errors.website_url = 'Enter a full HTTPS website URL, or leave blank.'
  for (const field of ['image_url', 'before_image', 'after_image'] as const) {
    if (form[field] && !validPortfolioImage(form[field])) errors[field] = 'Use an HTTPS image URL or a local /path.'
  }
  if (form.gallery_images.some((url) => !validPortfolioImage(url))) errors.gallery_images = 'Every gallery image needs an HTTPS URL or local /path.'
  if (!Number.isSafeInteger(form.display_order)) errors.display_order = 'Enter a whole number.'
  return errors
}

export function portfolioPayload(form: PortfolioEditor) {
  const errors = validatePortfolio(form)
  if (Object.keys(errors).length) throw new Error('Check the highlighted fields before saving.')
  // Explicit allowlist. Legacy/internal fields (including case_study_content,
  // testimonial, technology and result_metrics) are left untouched in storage.
  const payload = Object.fromEntries(Object.keys(EMPTY_PORTFOLIO).map((key) => [key, form[key as keyof PortfolioEditor]])) as PortfolioEditor
  return { ...payload, gallery_images: [...form.gallery_images], technologies_used: [...form.technologies_used] }
}

export function newPortfolioPayload(title: string, slug: string) {
  if (!title.trim() || !validWorkSlug(slug)) throw new Error('Enter a title and a valid, non-reserved slug.')
  return { title: title.trim(), client_name: title.trim(), slug, is_active: false, featured: false, display_order: 0 }
}

export function portfolioErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

export function moveGalleryImage(images: string[], index: number, direction: -1 | 1) {
  const next = [...images]
  const target = index + direction
  if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
