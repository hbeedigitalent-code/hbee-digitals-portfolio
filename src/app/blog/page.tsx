'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PageUtilities from '@/components/ui/PageUtilities'
import { supabase } from '@/lib/supabase'

type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  featured_image?: string | null
  featured_image_alt?: string | null
  tags?: string[] | null
  author?: string | null
  status?: string | null
  is_featured?: boolean | null
  featured_badge?: string | null
  read_time?: string | null
  published_at?: string | null
  created_at?: string | null
}

function formatDate(date?: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function IconMask({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMask: `url(/svgs/${name}.svg) center / contain no-repeat`,
        mask: `url(/svgs/${name}.svg) center / contain no-repeat`,
      }}
    />
  )
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState('All')

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Blog fetch error:', error)
      setPosts([])
    } else {
      setPosts(data || [])
    }

    setLoading(false)
  }

  const tags = useMemo(() => {
    const allTags = posts.flatMap((post) => post.tags || [])
    return ['All', ...Array.from(new Set(allTags)).slice(0, 10)]
  }, [posts])

  const filteredPosts = useMemo(() => {
    if (activeTag === 'All') return posts
    return posts.filter((post) => post.tags?.includes(activeTag))
  }, [posts, activeTag])

  const featuredPost = useMemo(() => {
    return filteredPosts.find((post) => post.is_featured) || filteredPosts[0]
  }, [filteredPosts])

  const latestPosts = useMemo(() => {
    return filteredPosts.filter((post) => post.id !== featuredPost?.id)
  }, [filteredPosts, featuredPost])

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
        <section className="relative overflow-hidden px-5 pb-12 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--accent)]/10 to-transparent" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[var(--accent)]">
              <IconMask name="blog" />
              <span className="text-xs font-black uppercase tracking-[0.16em]">
                Hbee Insights
              </span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Practical ecommerce growth insights
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Strategy articles on ecommerce, Shopify, conversion optimization,
              customer trust, brand positioning, and digital systems built for growth.
            </p>

            {tags.length > 1 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`rounded-full px-4 py-2 text-xs font-black transition ${
                      activeTag === tag
                        ? 'bg-[var(--accent)] text-[#07111F]'
                        : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <section className="flex min-h-[360px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </section>
        ) : filteredPosts.length === 0 ? (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-20 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-section)] text-[var(--text-muted)]">
                <IconMask name="blog" className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-black">No published articles yet.</h2>
              <p className="mt-3 text-[var(--text-muted)]">
                Publish a new blog post from the admin dashboard and it will appear here.
              </p>
            </div>
          </section>
        ) : (
          <>
            {featuredPost && (
              <section className="px-5 py-8 sm:px-6 md:px-10 lg:px-12">
                <div className="mx-auto max-w-[1080px]">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-black">Featured Article</h2>

                    <Link
                      href={`/blog/${featuredPost.slug}`}
                      className="hidden items-center gap-2 text-sm font-black text-[var(--accent)] sm:inline-flex"
                    >
                      Read Article
                      <IconMask name="arrow-right" />
                    </Link>
                  </div>

                  <BlogCard post={featuredPost} featured />
                </div>
              </section>
            )}

            <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
              <div className="mx-auto max-w-[1080px]">
                <div className="mb-8">
                  <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                    Latest Articles
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Fresh insights to help you improve trust, conversion, and digital growth.
                  </p>
                </div>

                {latestPosts.length > 0 ? (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {latestPosts.map((post) => (
                      <BlogCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-section)] text-[var(--text-muted)]">
                      <IconMask name="blog" className="h-6 w-6" />
                    </div>
                    <p className="text-[var(--text-muted)]">
                      No other articles yet. Publish another post to fill this section.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-[1080px] rounded-[2rem] border border-[var(--border)] bg-[#07111F] p-8 text-center text-white shadow-xl sm:p-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[#39D97A]">
              <IconMask name="growth" />
              <span className="text-xs font-black uppercase tracking-[0.16em]">
                Ready to Scale?
              </span>
            </div>

            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Turn ecommerce insights into measurable growth
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Let’s review your website, customer journey, trust signals, and growth
              opportunities so your brand can convert better.
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#07111F] transition hover:scale-105"
            >
              Request a Growth Review
              <IconMask name="arrow-right" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <PageUtilities />
    </>
  )
}

function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article
        className={`flex h-full flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] transition duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-xl ${
          featured ? 'rounded-[2rem]' : 'rounded-2xl'
        }`}
      >
        <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)]">
          {post.featured_image ? (
            <img
              src={post.featured_image}
              alt={post.featured_image_alt || post.title}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
              <IconMask name="blog" className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className={featured ? 'p-6 sm:p-8 lg:p-10' : 'flex flex-1 flex-col p-5'}>
          <div className="mb-4 flex flex-wrap gap-2">
            {post.is_featured && (
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#07111F]">
                {post.featured_badge || 'Featured'}
              </span>
            )}

            {post.tags?.slice(0, featured ? 4 : 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3
            className={`font-black leading-tight tracking-[-0.04em] text-[var(--text-primary)] transition group-hover:text-[var(--accent)] ${
              featured ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-xl'
            }`}
          >
            {post.title}
          </h3>

          {post.excerpt && (
            <p
              className={`mt-4 text-[var(--text-secondary)] ${
                featured ? 'max-w-3xl text-base leading-8' : 'line-clamp-3 text-sm leading-7'
              }`}
            >
              {post.excerpt}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-xs text-[var(--text-muted)]">
            <span className="font-bold text-[var(--text-primary)]">
              {post.author || 'Hbee Digitals'}
            </span>

            <span className="flex items-center gap-1.5">
              <IconMask name="calendar" className="h-3.5 w-3.5" />
              {formatDate(post.published_at || post.created_at)}
            </span>

            {post.read_time && (
              <span className="flex items-center gap-1.5">
                <IconMask name="clock" className="h-3.5 w-3.5" />
                {post.read_time}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}