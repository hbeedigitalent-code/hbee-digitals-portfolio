import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { CAPABILITY_DETAILS } from '@/components/site/capability/capability-content'
import { isValidPortfolioSlug, text } from '@/lib/site/home-data'
import { insightCanonical } from '@/lib/blog-utils'
import { portfolioCreativeEnabled } from '@/lib/portfolio-creative'

const baseUrl = 'https://hbeedigitals.com'
const insightSlugPattern = /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/

function realDate(value: unknown): Date | undefined {
  const raw = text(value)
  if (!raw || Number.isNaN(Date.parse(raw))) return undefined
  return new Date(raw)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Final public routes only. Retired paths (/portfolio, /blog, /process,
  // /growth-readiness, /assessment, /reviews, /before-after, /pricing, /faq) redirect and are deliberately absent;
  // /growth-review/received is a noindex confirmation state and is absent too.
  const staticRoutes = [
    { route: '', priority: 1, changeFrequency: 'weekly' as const },

    { route: '/services', priority: 0.9, changeFrequency: 'monthly' as const },

    { route: '/work', priority: 0.88, changeFrequency: 'monthly' as const },

    { route: '/how-we-work', priority: 0.8, changeFrequency: 'monthly' as const },

    { route: '/insights', priority: 0.82, changeFrequency: 'weekly' as const },

    { route: '/about', priority: 0.85, changeFrequency: 'monthly' as const },

    { route: '/growth-review', priority: 0.9, changeFrequency: 'monthly' as const },

    { route: '/contact', priority: 0.9, changeFrequency: 'monthly' as const },

    { route: '/privacy', priority: 0.35, changeFrequency: 'yearly' as const },

    { route: '/terms', priority: 0.35, changeFrequency: 'yearly' as const },

    { route: '/cookies', priority: 0.35, changeFrequency: 'yearly' as const },
  ]

  const [{ data: portfolioItems }, { data: blogPosts }, caseStudyRows] = await Promise.all([
    supabase
      .from('portfolio_items')
      .select('slug, client_name, name, title, updated_at')
      .eq('is_active', true),

    supabase
      .from('blog_posts')
      .select('slug, title, canonical_url, updated_at, published_at')
      .eq('status', 'published'),

    // Flag on only, and a separate query: a database without the column just returns an error => no Case Studies.
    portfolioCreativeEnabled()
      ? supabase.from('portfolio_items').select('slug, is_case_study').eq('is_active', true).eq('is_case_study', true)
      : Promise.resolve({ data: null }),
  ])
  const caseStudySlugs = new Set((caseStudyRows.data ?? []).map((row) => text(row.slug)))

  // Capability detail pages are static content (one per capability), not CMS rows.
  const serviceRoutes = Object.keys(CAPABILITY_DETAILS).map((slug) => ({
    url: `${baseUrl}/services/${slug}`,
    changeFrequency: 'monthly' as const,
    priority: 0.84,
  }))

  const workRoutes =
    portfolioItems
      ?.flatMap((item) => {
        const slug = text(item.slug)
        const client = text(item.client_name) ?? text(item.name) ?? text(item.title)
        if (!isValidPortfolioSlug(slug) || !client) return []
        const lastModified = realDate(item.updated_at)
        // A Case Study's canonical page is /case-studies/[slug]; /work/[slug] redirects there, so list only one.
        const caseStudy = caseStudySlugs.has(slug)
        return [{
          url: `${baseUrl}${caseStudy ? '/case-studies' : '/work'}/${slug}`,
          ...(lastModified ? { lastModified } : {}),
          changeFrequency: 'monthly' as const,
          priority: 0.85,
        }]
      }) || []

  const insightRoutes =
    blogPosts
      ?.flatMap((post) => {
        const slug = text(post.slug)
        if (!slug || !insightSlugPattern.test(slug) || !text(post.title)) return []
        const url = `${baseUrl}/insights/${slug}`
        if (insightCanonical(slug, text(post.canonical_url)) !== url) return []
        // Real modification date only: updated_at, then published_at. If neither
        // exists, omit lastModified rather than emit the crawl time as a fake date.
        const lastModified = realDate(post.updated_at) ?? realDate(post.published_at)
        return [{
          url,
          ...(lastModified ? { lastModified } : {}),
          changeFrequency: 'weekly' as const,
          priority: 0.78,
        }]
      }) || []

  return [
    ...staticRoutes.map((item) => ({
      url: `${baseUrl}${item.route}`,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),

    ...serviceRoutes,
    ...(portfolioCreativeEnabled() && workRoutes.some((route) => route.url.startsWith(`${baseUrl}/case-studies/`))
      ? [{ url: `${baseUrl}/case-studies`, changeFrequency: 'monthly' as const, priority: 0.86 }]
      : []),
    ...workRoutes,
    ...insightRoutes,
  ]
}
