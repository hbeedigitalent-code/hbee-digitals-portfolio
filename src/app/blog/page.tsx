'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  featured_image?: string
  status: string
  published_at?: string
  created_at: string  // ← ADD THIS
  read_time?: string
  author?: string
  tags?: string[] | string
  is_featured?: boolean
  post_type?: string
  views?: number
}

interface Category {
  id: string
  name: string
  slug: string
  is_active: boolean
}

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value.split(',').map(t => t.trim()).filter(Boolean)
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

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [postType, setPostType] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories()
    fetchPosts()
  }, [])

  async function fetchCategories() {
    const { data } = await supabase
      .from('blog_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    setCategories(data || [])
  }

  async function fetchPosts() {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }

  // Filter posts
  const filteredPosts = posts.filter(post => {
    if (postType !== 'all' && post.post_type !== postType) return false
    return true
  })

  const featuredPost = filteredPosts.find(post => post.is_featured) || filteredPosts[0]
  const otherPosts = featuredPost ? filteredPosts.filter(post => post.id !== featuredPost.id) : filteredPosts

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <main className="relative overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        {/* Hero */}
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

        {/* Post Type Filter */}
        <section className="px-5 pb-8 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPostType('all')}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  postType === 'all'
                    ? 'bg-gradient-orange-green text-white'
                    : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--accent)]/25'
                }`}
              >
                All Content
              </button>
              <button
                onClick={() => setPostType('blog')}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  postType === 'blog'
                    ? 'bg-gradient-orange-green text-white'
                    : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--accent)]/25'
                }`}
              >
                📝 Blog Posts
              </button>
              <button
                onClick={() => setPostType('case_study')}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  postType === 'case_study'
                    ? 'bg-gradient-orange-green text-white'
                    : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--accent)]/25'
                }`}
              >
                📊 Case Studies
              </button>
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

                  <div className="absolute left-5 top-5 flex gap-2">
                    <span className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent)] backdrop-blur-xl">
                      Featured Insight
                    </span>
                    {featuredPost.post_type === 'case_study' && (
                      <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-purple-400 backdrop-blur-xl">
                        Case Study
                      </span>
                    )}
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

                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] group-hover:gap-3">
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
                      
                      {post.post_type === 'case_study' && (
                        <div className="absolute left-3 top-3 rounded-full bg-purple-500/20 px-2 py-1 text-[9px] font-black uppercase text-purple-400 backdrop-blur-md">
                          Case Study
                        </div>
                      )}
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

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] group-hover:gap-3">
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
                  {postType === 'case_study' ? 'Case studies coming soon' : 'Blog content coming soon'}
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                  {postType === 'case_study' 
                    ? "We're preparing detailed client success stories and case studies."
                    : "We're preparing practical articles on ecommerce, websites, conversion, Shopify, and digital growth systems."}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  )
}