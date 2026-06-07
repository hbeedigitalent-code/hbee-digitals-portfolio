'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PageUtilities from '@/components/ui/PageUtilities'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  featured_image?: string
  featured_image_alt?: string
  published_at?: string
  created_at: string
  read_time?: string
  tags?: string[]
  author?: string
  status: string
  post_type: string
  is_featured?: boolean
  featured_badge?: string
}

function formatDate(date?: string) {
  if (!date) return ''

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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
      .eq('post_type', 'blog')
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
    return ['All', ...Array.from(new Set(allTags)).slice(0, 8)]
  }, [posts])

  const filteredPosts = useMemo(() => {
    if (activeTag === 'All') return posts
    return posts.filter((post) => post.tags?.includes(activeTag))
  }, [posts, activeTag])

  const featuredPost = useMemo(() => {
    return filteredPosts.find((post) => post.is_featured) || filteredPosts[0]
  }, [filteredPosts])

  const otherPosts = useMemo(() => {
    if (!featuredPost) return []
    return filteredPosts.filter((post) => post.id !== featuredPost.id)
  }, [filteredPosts, featuredPost])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </main>
        <Footer />
        <PageUtilities />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="bg-[var(--bg-page)] text-[var(--text-primary)]">
        <section className="relative overflow-hidden px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--accent)]/10 to-transparent" />
          <div className="pointer-events-none absolute left-1/2 top-20 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-[980px] text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2">
              <img src="/svgs/blog.svg" alt="" className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                Hbee Insights
              </span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Practical ecommerce growth insights
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
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

        {featuredPost && (
          <section className="px-5 py-8 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-[1080px]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-black text-[var(--text-primary)]">
                  Featured Article
                </h2>

                <Link
                  href={`/blog/${featuredPost.slug}`}
                  className="hidden items-center gap-2 text-sm font-black text-[var(--accent)] sm:inline-flex"
                >
                  Read Article
                  <img src="/svgs/arrow-right.svg" alt="" className="h-4 w-4" />
                </Link>
              </div>

              <Link href={`/blog/${featuredPost.slug}`} className="group block">
                <article className="grid overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-xl shadow-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)] lg:aspect-auto">
                    <img
                      src={featuredPost.featured_image || '/placeholder-blog.jpg'}
                      alt={featuredPost.featured_image_alt || featuredPost.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#07111F]">
                        {featuredPost.featured_badge || 'Featured'}
                      </span>

                      {featuredPost.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold text-[var(--accent)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-2xl font-black leading-tight tracking-[-0.04em] text-[var(--text-primary)] transition group-hover:text-[var(--accent)] sm:text-3xl">
                      {featuredPost.title}
                    </h3>

                    {featuredPost.excerpt && (
                      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                        {featuredPost.excerpt}
                      </p>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
                      <span className="flex items-center gap-2">
                        <img src="/svgs/user.svg" alt="" className="h-4 w-4" />
                        {featuredPost.author || 'Hbee Digitals'}
                      </span>

                      <span className="flex items-center gap-2">
                        <img src="/svgs/calendar.svg" alt="" className="h-4 w-4" />
                        {formatDate(featuredPost.published_at || featuredPost.created_at)}
                      </span>

                      {featuredPost.read_time && (
                        <span className="flex items-center gap-2">
                          <img src="/svgs/clock.svg" alt="" className="h-4 w-4" />
                          {featuredPost.read_time}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            </div>
          </section>
        )}

        <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-[1080px]">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">
                  Latest Articles
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Fresh insights to help you improve trust, conversion, and digital growth.
                </p>
              </div>

              <p className="text-sm font-bold text-[var(--text-muted)]">
                {filteredPosts.length} article{filteredPosts.length === 1 ? '' : 's'}
              </p>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-20 text-center">
                <img src="/svgs/blog.svg" alt="" className="mx-auto mb-5 h-16 w-16 opacity-50" />
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  No blog posts found.
                </h2>
                <p className="mt-3 text-[var(--text-muted)]">
                  Try selecting another category.
                </p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {otherPosts.map((post) => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                      <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)]">
                        <img
                          src={post.featured_image || '/placeholder-blog.jpg'}
                          alt={post.featured_image_alt || post.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="mb-4 flex flex-wrap gap-2">
                          {post.tags?.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-bold text-[var(--accent)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <h3 className="line-clamp-2 text-xl font-black leading-tight text-[var(--text-primary)] transition group-hover:text-[var(--accent)]">
                          {post.title}
                        </h3>

                        {post.excerpt && (
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                            {post.excerpt}
                          </p>
                        )}

                        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1.5">
                            <img src="/svgs/calendar.svg" alt="" className="h-3.5 w-3.5" />
                            {formatDate(post.published_at || post.created_at)}
                          </span>

                          {post.read_time && (
                            <span className="flex items-center gap-1.5">
                              <img src="/svgs/clock.svg" alt="" className="h-3.5 w-3.5" />
                              {post.read_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-[1080px] gap-8 rounded-[2rem] border border-[var(--border)] bg-[#07111F] p-8 text-white shadow-xl sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <img src="/svgs/growth.svg" alt="" className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Ready to Scale?
                </span>
              </div>

              <h2 className="max-w-2xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Turn ecommerce insights into measurable growth
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                Let’s review your website, customer journey, trust signals, and growth
                opportunities so your brand can convert better.
              </p>
            </div>

            <Link
              href="/contact"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#07111F] transition hover:scale-105"
            >
              Request a Growth Review
              <img src="/svgs/arrow-right.svg" alt="" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <PageUtilities />
    </>
  )
}