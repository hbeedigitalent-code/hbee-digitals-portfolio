'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image: string | null
  tags: string[] | null
  status: string
  is_featured: boolean
  featured_badge: string | null
  read_time: string | null
  published_at: string | null
  updated_at: string | null
  og_image: string | null
}

type FilterStatus = 'all' | 'published' | 'draft' | 'featured'

export default function AdminBlogPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [actionMessage, setActionMessage] = useState('')
  const [user, setUser] = useState<unknown>(null)

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/admin/login')
        return
      }
      setUser(data.user)
    }
    checkAuth()
  }, [router])

  // Fetch posts
  useEffect(() => {
    async function fetchPosts() {
      setLoading(true)
      const { data, error } = await supabase
        .from('blog_posts')
        .select(
          'id, title, slug, excerpt, featured_image, tags, status, is_featured, featured_badge, read_time, published_at, updated_at, og_image'
        )
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching posts:', error)
      } else {
        setPosts(data || [])
        setFilteredPosts(data || [])
      }
      setLoading(false)
    }

    if (user) fetchPosts()
  }, [user])

  // Filter posts
  useEffect(() => {
    let filtered = posts

    if (statusFilter !== 'all') {
      if (statusFilter === 'featured') {
        filtered = filtered.filter((p) => p.is_featured)
      } else {
        filtered = filtered.filter((p) => p.status === statusFilter)
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q)
      )
    }

    setFilteredPosts(filtered)
  }, [searchQuery, statusFilter, posts])

  // Toggle publish status
  async function togglePublish(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('blog_posts')
      .update({
        status: newStatus,
        published_at:
          newStatus === 'published' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setActionMessage(`Error: ${error.message}`)
    } else {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: newStatus,
                published_at:
                  newStatus === 'published' ? new Date().toISOString() : null,
              }
            : p
        )
      )
      setActionMessage(
        newStatus === 'published' ? 'Post published!' : 'Post moved to drafts'
      )
      setTimeout(() => setActionMessage(''), 3000)
    }
  }

  // Toggle featured
  async function toggleFeatured(id: string, current: boolean) {
    const { error } = await supabase
      .from('blog_posts')
      .update({ is_featured: !current, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      setActionMessage(`Error: ${error.message}`)
    } else {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_featured: !current } : p))
      )
      setActionMessage(!current ? 'Post featured!' : 'Removed from featured')
      setTimeout(() => setActionMessage(''), 3000)
    }
  }

  // Delete post
  async function deletePost(id: string) {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return

    const { error } = await supabase.from('blog_posts').delete().eq('id', id)

    if (error) {
      setActionMessage(`Error: ${error.message}`)
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== id))
      setActionMessage('Post deleted')
      setTimeout(() => setActionMessage(''), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39D97A] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
              Blog Posts
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {posts.length} total post{posts.length !== 1 ? 's' : ''} &middot;{' '}
              {posts.filter((p) => p.status === 'published').length} published
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-2 rounded-full bg-[#39D97A] px-5 py-2.5 text-sm font-black text-[#07111F] transition hover:scale-[1.02]"
            >
              <span className="text-lg leading-none">+</span>
              New Post
            </Link>
          </div>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className="mb-4 rounded-xl bg-[#39D97A]/10 px-4 py-3 text-sm font-semibold text-[#39D97A]">
            {actionMessage}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1">
            {(['all', 'published', 'draft', 'featured'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${
                  statusFilter === filter
                    ? 'bg-[#39D97A] text-[#07111F]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {filter}
                {filter === 'all' && ` (${posts.length})`}
                {filter === 'published' &&
                  ` (${posts.filter((p) => p.status === 'published').length})`}
                {filter === 'draft' &&
                  ` (${posts.filter((p) => p.status === 'draft').length})`}
                {filter === 'featured' &&
                  ` (${posts.filter((p) => p.is_featured).length})`}
              </button>
            ))}
          </div>

          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[#39D97A] sm:w-64"
          />
        </div>

        {/* Posts Table */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">Post</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">OG</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="transition hover:bg-[var(--bg-page)]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {post.featured_image ? (
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={post.featured_image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-page)]">
                            <img
                              src="/svgs/blog.svg"
                              alt=""
                              className="h-5 w-5 opacity-30"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {post.title}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            /blog/{post.slug}
                          </p>
                          {post.is_featured && post.featured_badge && (
                            <span className="mt-1 inline-block rounded bg-[#39D97A]/10 px-2 py-0.5 text-[10px] font-bold text-[#39D97A]">
                              {post.featured_badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          post.status === 'published'
                            ? 'bg-[#39D97A]/10 text-[#39D97A]'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            post.status === 'published' ? 'bg-[#39D97A]' : 'bg-amber-400'
                          }`}
                        />
                        {post.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          post.og_image || post.featured_image
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {post.og_image || post.featured_image ? 'Ready' : 'Missing'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-xs text-[var(--text-muted)]">
                        {post.published_at && (
                          <span>
                            {new Date(post.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        {post.read_time && (
                          <span className="ml-2">| {post.read_time}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-page)] hover:text-[#39D97A]"
                          title="View"
                        >
                          <img src="/svgs/link.svg" alt="View" className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/admin/blog/edit/${post.id}`}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-page)] hover:text-[#39D97A]"
                          title="Edit"
                        >
                          <img src="/svgs/blog.svg" alt="Edit" className="h-4 w-4" />
                        </Link>

                        <button
                          onClick={() => togglePublish(post.id, post.status)}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-page)] hover:text-[#39D97A]"
                          title={
                            post.status === 'published' ? 'Unpublish' : 'Publish'
                          }
                        >
                          <span className="text-xs font-bold">
                            {post.status === 'published' ? 'D' : 'P'}
                          </span>
                        </button>

                        <button
                          onClick={() => toggleFeatured(post.id, post.is_featured)}
                          className={`rounded-lg p-2 transition hover:bg-[var(--bg-page)] ${
                            post.is_featured
                              ? 'text-[#39D97A]'
                              : 'text-[var(--text-muted)] hover:text-[#39D97A]'
                          }`}
                          title={post.is_featured ? 'Unfeature' : 'Feature'}
                        >
                          <span className="text-xs font-bold">F</span>
                        </button>

                        <button
                          onClick={() => deletePost(post.id)}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
                          title="Delete"
                        >
                          <span className="text-xs font-bold">X</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPosts.length === 0 && (
            <div className="p-12 text-center">
              <img
                src="/svgs/blog.svg"
                alt=""
                className="mx-auto mb-4 h-12 w-12 opacity-20"
              />
              <p className="text-[var(--text-muted)]">No posts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}