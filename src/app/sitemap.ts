import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { CAPABILITY_DETAILS } from '@/components/site/capability/capability-content'

const baseUrl = 'https://hbeedigitals.com'

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

  const [{ data: portfolioItems }, { data: blogPosts }] = await Promise.all([
    supabase
      .from('portfolio_items')
      .select('slug')
      .eq('is_active', true),

    supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published'),
  ])

  // Capability detail pages are static content (one per capability), not CMS rows.
  const serviceRoutes = Object.keys(CAPABILITY_DETAILS).map((slug) => ({
    url: `${baseUrl}/services/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.84,
  }))

  const workRoutes =
    portfolioItems
      ?.filter((item) => item.slug)
      .map((item) => ({
        url: `${baseUrl}/work/${item.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.85,
      })) || []

  const insightRoutes =
    blogPosts
      ?.filter((post) => post.slug)
      .map((post) => {
        // Real modification date only: updated_at, then published_at. If neither
        // exists, omit lastModified rather than emit the crawl time as a fake date.
        const lastMod = post.updated_at || post.published_at
        return {
          url: `${baseUrl}/insights/${post.slug}`,
          ...(lastMod ? { lastModified: new Date(lastMod) } : {}),
          changeFrequency: 'weekly' as const,
          priority: 0.78,
        }
      }) || []

  return [
    ...staticRoutes.map((item) => ({
      url: `${baseUrl}${item.route}`,
      lastModified: new Date(),
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    })),

    ...serviceRoutes,
    ...workRoutes,
    ...insightRoutes,
  ]
}
