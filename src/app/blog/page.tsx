import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Hbee Insights — Ecommerce Growth Blog | Hbee Digitals',
  description:
    'Practical ecommerce growth insights. Strategy articles on ecommerce, Shopify, conversion optimization, customer trust, brand positioning, and digital systems built for growth.',
  alternates: {
    canonical: 'https://www.hbeedigitals.com/blog',
  },
  openGraph: {
    title: 'Hbee Insights — Ecommerce Growth Blog',
    description:
      'Strategy articles on ecommerce, Shopify, conversion optimization, and digital growth.',
    url: 'https://www.hbeedigitals.com/blog',
    siteName: 'Hbee Digitals',
    type: 'website',
  },
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image: string | null
  featured_image_alt: string | null
  tags: string[] | null
  author: string | null
  status: string
  is_featured: boolean
  featured_badge: string | null
  read_time: string | null
  published_at: string | null
  created_at: string | null
}

// Fetch published blog posts
async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, status, is_featured, featured_badge, read_time, published_at, created_at'
      )
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching blog posts:', error)
      return []
    }

    return data || []
  } catch {
    return []
  }
}

// Get all unique tags from published posts
function getAllTags(posts: BlogPost[]): string[] {
  const tagSet = new Set<string>()
  posts.forEach((post) => {
    post.tags?.forEach((tag) => {
      if (tag?.trim()) tagSet.add(tag.trim())
    })
  })
  return ['All', ...Array.from(tagSet).sort()]
}

export default async function BlogPage() {
  const posts = await getBlogPosts()
  const tags = getAllTags(posts)

  const featuredPost = posts.find((p) => p.is_featured) || posts[0]
  const latestPosts = featuredPost
    ? posts.filter((p) => p.id !== featuredPost.id)
    : posts

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[var(--bg-page)]">
        {/* Hero Header */}
        <section className="relative overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2">
              <img src="/svgs/blog.svg" alt="" className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                Hbee Insights
              </span>
            </div>

            <h1 className="text-4xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Practical ecommerce growth insights
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
              Strategy articles on ecommerce, Shopify, conversion optimization, customer
              trust, brand positioning, and digital systems built for growth.
            </p>
          </div>
        </section>

        {/* Tag Filters */}
        {tags.length > 1 && (
          <section className="px-4 pb-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-wrap justify-center gap-2">
                {tags.map((tag) => (
                  <TagFilter key={tag} tag={tag} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Article */}
        {featuredPost && (
          <section className="px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-black text-[var(--text-primary)]">
                  Featured Article
                </h2>
                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="flex items-center gap-1 text-sm font-bold text-[#39D97A] transition hover:underline"
                >
                  Read Article
                  <img src="/svgs/arrow-right.svg" alt="" className="h-4 w-4" />
                </Link>
              </div>

              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:-translate-y-1 hover:shadow-xl lg:flex-row"
              >
                {featuredPost.featured_image && (
                  <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:w-1/2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredPost.featured_image}
                      alt={featuredPost.featured_image_alt || featuredPost.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-center p-6 sm:p-10">
                  {featuredPost.featured_badge && (
                    <span className="mb-3 w-fit rounded-full bg-[#39D97A]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#39D97A]">
                      {featuredPost.featured_badge}
                    </span>
                  )}

                  {featuredPost.tags && featuredPost.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {featuredPost.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-semibold text-[#39D97A]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <h3 className="text-xl font-black leading-snug tracking-[-0.02em] text-[var(--text-primary)] group-hover:text-[#39D97A] transition sm:text-2xl">
                    {featuredPost.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[var(--text-muted)]">
                    {featuredPost.excerpt}
                  </p>

                  <div className="mt-5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {featuredPost.author || 'Hbee Digitals'}
                    </span>
                    {featuredPost.published_at && (
                      <>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <img
                            src="/svgs/calendar.svg"
                            alt=""
                            className="h-3 w-3 opacity-50"
                          />
                          {new Date(featuredPost.published_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </>
                    )}
                    {featuredPost.read_time && (
                      <>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                          <img
                            src="/svgs/clock.svg"
                            alt=""
                            className="h-3 w-3 opacity-50"
                          />
                          {featuredPost.read_time}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Latest Articles Grid */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <h2 className="text-lg font-black text-[var(--text-primary)]">
                Latest Articles
              </h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Fresh insights to help you improve trust, conversion, and digital growth.
              </p>
            </div>

            {latestPosts.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {latestPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:-translate-y-1 hover:border-[#39D97A]/30 hover:shadow-lg"
                  >
                    {post.featured_image && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.featured_image}
                          alt={post.featured_image_alt || post.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-5">
                      {post.tags && post.tags.length > 0 && (
                        <span className="mb-2 text-xs font-bold uppercase tracking-wider text-[#39D97A]">
                          {post.tags[0]}
                        </span>
                      )}

                      <h3 className="text-sm font-bold leading-snug text-[var(--text-primary)] transition group-hover:text-[#39D97A]">
                        {post.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                        {post.excerpt}
                      </p>

                      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-[var(--text-muted)]">
                        {post.read_time && (
                          <span className="flex items-center gap-1">
                            <img
                              src="/svgs/clock.svg"
                              alt=""
                              className="h-3 w-3 opacity-50"
                            />
                            {post.read_time}
                          </span>
                        )}
                        {post.published_at && (
                          <span>
                            {new Date(post.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
                <img
                  src="/svgs/blog.svg"
                  alt=""
                  className="mx-auto mb-4 h-12 w-12 opacity-20"
                />
                <p className="text-[var(--text-muted)]">
                  No articles yet. Check back soon for new content.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[2.5rem] border border-[var(--border)] bg-[#07111F] p-8 text-center sm:p-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <img src="/svgs/growth.svg" alt="" className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                Ready to Scale?
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
              Turn ecommerce insights into measurable growth
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
              Let&apos;s review your website, customer journey, trust signals, and growth
              opportunities so your brand can convert better.
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#39D97A] px-8 py-4 text-sm font-black text-[#07111F] transition hover:scale-[1.02]"
            >
              Request a Growth Review
              <img src="/svgs/arrow-right.svg" alt="" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

// Tag filter button component
function TagFilter({ tag }: { tag: string }) {
  return (
    <a
      href={`#${tag.toLowerCase().replace(/\s+/g, '-')}`}
      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
        tag === 'All'
          ? 'bg-[#39D97A] text-[#07111F]'
          : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[#39D97A] hover:text-[#39D97A]'
      }`}
    >
      {tag}
    </a>
  )
}