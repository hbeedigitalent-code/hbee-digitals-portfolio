'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  status: string
  post_type: string
  is_featured: boolean
  published_at: string | null
  created_at: string
  updated_at?: string | null
  featured_image: string | null
  read_time: string | null
  author?: string | null
  tags?: string[] | null
  seo_title?: string | null
  seo_description?: string | null
  og_image?: string | null
}

function formatDate(date?: string | null) {
  if (!date) return 'Not published'

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: string }) {
  const isPublished = status === 'published'

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ${
        isPublished
          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'bg-orange-500/10 text-orange-500'
      }`}
    >
      {status}
    </span>
  )
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'featured'>('all')

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setPosts([])
    } else {
      setPosts(data || [])
    }

    setLoading(false)
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this blog post?')) return

    const { error } = await supabase.from('blog_posts').delete().eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setPosts((prev) => prev.filter((post) => post.id !== id))
  }

  async function toggleStatus(post: BlogPost) {
    const newStatus = post.status === 'published' ? 'draft' : 'published'

    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: newStatus,
        published_at:
          newStatus === 'published'
            ? post.published_at || new Date().toISOString()
            : post.published_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)

    if (error) {
      alert(error.message)
      return
    }

    fetchPosts()
  }

  async function toggleFeatured(post: BlogPost) {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        is_featured: !post.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)

    if (error) {
      alert(error.message)
      return
    }

    fetchPosts()
  }

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.slug.toLowerCase().includes(search.toLowerCase()) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))

      const matchesFilter =
        filter === 'all' ||
        post.status === filter ||
        (filter === 'featured' && post.is_featured)

      return matchesSearch && matchesFilter
    })
  }, [posts, search, filter])

  const stats = useMemo(() => {
    return {
      total: posts.length,
      published: posts.filter((post) => post.status === 'published').length,
      draft: posts.filter((post) => post.status === 'draft').length,
      featured: posts.filter((post) => post.is_featured).length,
    }
  }, [posts])

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[var(--text-primary)]">
            Blog Posts
          </h1>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create, edit, publish, and manage Hbee Digitals growth articles.
          </p>
        </div>

        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[#07111F] transition hover:scale-[1.02]"
        >
          <img src="/svgs/blog.svg" alt="" className="h-4 w-4" />
          New Blog Post
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total Posts', stats.total],
          ['Published', stats.published],
          ['Drafts', stats.draft],
          ['Featured', stats.featured],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {label}
            </p>

            <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <img
              src="/svgs/search.svg"
              alt=""
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search blog posts..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All'],
              ['published', 'Published'],
              ['draft', 'Drafts'],
              ['featured', 'Featured'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value as typeof filter)}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  filter === value
                    ? 'bg-[var(--accent)] text-[#07111F]'
                    : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        {loading ? (
          <div className="p-10 text-center text-[var(--text-muted)]">
            Loading posts...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-10 text-center">
            <img src="/svgs/blog.svg" alt="" className="mx-auto mb-4 h-12 w-12 opacity-50" />

            <p className="font-bold text-[var(--text-primary)]">
              No blog posts found.
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Create a new article or adjust your search filter.
            </p>

            <Link
              href="/admin/blog/new"
              className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[#07111F]"
            >
              Create Blog Post
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="grid gap-5 p-5 transition hover:bg-[var(--bg-section)]/60 lg:grid-cols-[180px_1fr_auto]"
              >
                <div className="aspect-[1200/630] overflow-hidden rounded-xl bg-[var(--bg-section)]">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <img src="/svgs/blog.svg" alt="" className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={post.status} />

                    {post.is_featured && (
                      <span className="rounded-full bg-[#07111F] px-3 py-1 text-xs font-black text-white">
                        Featured
                      </span>
                    )}

                    {post.og_image && (
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                        OG Ready
                      </span>
                    )}
                  </div>

                  <h2 className="line-clamp-2 text-xl font-black leading-tight text-[var(--text-primary)]">
                    {post.title}
                  </h2>

                  <p className="mt-1 break-all text-xs text-[var(--accent)]">
                    /blog/{post.slug}
                  </p>

                  {post.excerpt && (
                    <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                    <span>{post.author || 'Hbee Digitals'}</span>
                    <span>{post.read_time || 'No read time'}</span>
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>

                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-bold text-[var(--accent)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-start gap-2 lg:flex-col lg:items-stretch">
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-xs font-black text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    View
                  </Link>

                  <Link
                    href={`/admin/blog/edit/${post.id}`}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-xs font-black text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => toggleStatus(post)}
                    className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-black text-[#07111F]"
                  >
                    {post.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    onClick={() => toggleFeatured(post)}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-black text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {post.is_featured ? 'Unfeature' : 'Feature'}
                  </button>

                  <button
                    onClick={() => deletePost(post.id)}
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}