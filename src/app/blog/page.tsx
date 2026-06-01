import Link from 'next/link'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const revalidate = 60

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content?: string
  featured_image?: string
  status: string
  created_at: string
  published_at?: string
  read_time?: string
  author?: string
  tags?: string[] | string
  is_featured?: boolean
}

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function BlogPage() {
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const posts: BlogPost[] = data || []

  const featuredPost =
    posts.find((post) => post.is_featured) || posts[0]

  const otherPosts = featuredPost
    ? posts.filter((post) => post.id !== featuredPost.id)
    : posts

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        {/* Hero Section */}
        <section className="px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                <SvgIcon name="blog" size={14} color="var(--accent)" />
                Insights / Growth Notes
              </p>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
                Practical insights for better websites, stores, and{' '}
                <GradientHeading>growth.</GradientHeading>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                Articles on Shopify optimization, ecommerce UX, conversion strategy,
                branding, digital trust, and growth systems for ambitious brands.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Post */}
        {featuredPost && (
          <section className="px-5 pb-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group grid overflow-hidden rounded-[2.2rem] border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-lg)] transition hover:-translate-y-1 hover:border-[var(--accent)]/25 lg:grid-cols-[1.1fr_0.9fr]"
              >
                <div className="relative min-h-[320px] overflow-hidden rounded-[1.7rem] bg-[var(--bg-section)] sm:min-h-[440px]">
                  {featuredPost.featured_image ? (
                    <img
                      src={featuredPost.featured_image}
                      alt={featuredPost.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[320px] items-center justify-center">
                      <SvgIcon name="blog" size={72} color="var(--accent)" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/90 via-[var(--bg-page)]/20 to-transparent" />

                  <div className="absolute left-5 top-5 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent)] backdrop-blur-xl">
                    Featured Insight
                  </div>
                </div>

                <div className="relative flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                  <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                    {formatDate(featuredPost.published_at || featuredPost.created_at)}
                    {featuredPost.read_time ? ` • ${featuredPost.read_time}` : ''}
                  </p>

                  <h2 className="text-3xl font-black leading-[1] tracking-[-0.045em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
                    {featuredPost.title}
                  </h2>

                  <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                    {featuredPost.excerpt ||
                      'A practical growth insight for improving digital trust, user experience, and conversion performance.'}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {normalizeArray(featuredPost.tags).slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--accent)]/16 bg-[var(--accent)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">
                    Read Article
                    <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Blog Grid */}
        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            {otherPosts.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {otherPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-3 transition hover:-translate-y-1 hover:border-[var(--accent)]/25"
                  >
                    <div className="relative overflow-hidden rounded-[1.5rem] bg-[var(--bg-section)]">
                      {post.featured_image ? (
                        <img
                          src={post.featured_image}
                          alt={post.title}
                          className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center">
                          <SvgIcon name="blog" size={54} color="var(--accent)" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/80 via-transparent to-transparent" />
                    </div>

                    <div className="p-3 pt-5">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                        {formatDate(post.published_at || post.created_at)}
                        {post.read_time ? ` • ${post.read_time}` : ''}
                      </p>

                      <h3 className="text-xl font-black leading-tight text-[var(--text-primary)]">
                        {post.title}
                      </h3>

                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                        {post.excerpt ||
                          'A practical insight for better digital growth and customer experience.'}
                      </p>

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">
                        Read More
                        <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : !featuredPost ? (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] px-6 py-16 text-center">
                <SvgIcon name="blog" size={52} color="var(--accent)" />
                <h2 className="mt-5 text-2xl font-black text-[var(--text-primary)]">
                  Blog content coming soon
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                  We're preparing practical articles on ecommerce, websites,
                  conversion, Shopify, and digital growth systems.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}