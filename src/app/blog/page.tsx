'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image: string
  featured_image_alt?: string
  published_at: string
  created_at: string
  read_time: string
  tags: string[]
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

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
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

  const featuredPost = useMemo(() => {
    return posts.find((post) => post.is_featured) || posts[0]
  }, [posts])

  const otherPosts = useMemo(() => {
    if (!featuredPost) return []
    return posts.filter((post) => post.id !== featuredPost.id)
  }, [posts, featuredPost])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="bg-[var(--bg-page)]">
        <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent)]/10 to-transparent" />
          <div className="absolute left-1/2 top-20 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-[120px]" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2">
              <img src="/svgs/blog.svg" alt="" className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                Hbee Insights
              </span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Practical growth insights for ambitious brands
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Ecommerce strategy, conversion optimization, brand trust, Shopify
              growth, and digital systems designed to help businesses scale with clarity.
            </p>
          </div>
        </section>

        {featuredPost && (
          <section className="px-5 py-10 sm:px-6 md:px-10 lg:px-12">
            <Link href={`/blog/${featuredPost.slug}`} className="group mx-auto block max-w-6xl">
              <article className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-xl shadow-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
                <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)]">
                  <img
                    src={featuredPost.featured_image || '/placeholder-blog.jpg'}
                    alt={featuredPost.featured_image_alt || featuredPost.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="p-6 sm:p-8 lg:p-10">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#07111F]">
                      {featuredPost.featured_badge || 'Featured Insight'}
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

                  <h2 className="max-w-4xl text-2xl font-black leading-tight tracking-[-0.04em] text-[var(--text-primary)] transition group-hover:text-[var(--accent)] sm:text-3xl lg:text-4xl">
                    {featuredPost.title}
                  </h2>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                    {featuredPost.excerpt}
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
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

                    <span className="ml-auto hidden items-center gap-2 font-black text-[var(--accent)] sm:flex">
                      Read Article
                      <img src="/svgs/arrow-right.svg" alt="" className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          </section>
        )}

        <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            {posts.length === 0 ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-20 text-center">
                <img src="/svgs/blog.svg" alt="" className="mx-auto mb-5 h-16 w-16 opacity-50" />
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  No blog posts yet.
                </h2>
                <p className="mt-3 text-[var(--text-muted)]">
                  New growth insights will appear here soon.
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

                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                          {post.excerpt}
                        </p>

                        <div className="mt-auto flex items-center gap-4 pt-5 text-xs text-[var(--text-muted)]">
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
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-xl sm:p-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2">
              <img src="/svgs/growth.svg" alt="" className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                Ready to Scale?
              </span>
            </div>

            <h2 className="text-3xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl">
              Turn insights into measurable growth
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              Let’s review your website, customer journey, trust signals, and
              growth opportunities so your brand can convert better.
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-orange-green px-8 py-3 text-sm font-black text-white transition hover:scale-105"
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