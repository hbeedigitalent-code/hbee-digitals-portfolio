'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image: string
  read_time: string
  author: string
  tags: string[]
  is_active: boolean
  is_featured: boolean
  status: string
  post_type: string
  published_at: string
  created_at: string
  views: number
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('post_type', 'blog')
      .order('published_at', { ascending: false })

    const { data } = await query
    setPosts(data || [])
    setLoading(false)
  }

  async function deletePost(id: string) {
    if (confirm('Are you sure you want to delete this post?')) {
      await supabase.from('blog_posts').delete().eq('id', id)
      fetchPosts()
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    await supabase
      .from('blog_posts')
      .update({ 
        status: newStatus, 
        published_at: newStatus === 'published' ? new Date().toISOString() : null 
      })
      .eq('id', id)
    fetchPosts()
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">Blog Management</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage your blog articles, SEO, and tags</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-orange-green px-5 py-2.5 text-sm font-black text-white transition hover:scale-105"
        >
          <SvgIcon name="plus" size={16} color="white" />
          New Post
        </Link>
      </div>

      {/* Search and Filters - Mobile First */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <SvgIcon name="search" size={18} color="var(--text-muted)" className="absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] sm:hidden"
        >
          <span>Filter Posts</span>
          <SvgIcon name="chevron-down" size={16} color="var(--accent)" className={`transition ${showMobileFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Filter Bar - Desktop always visible, Mobile toggle */}
        <div className={`flex flex-wrap gap-2 ${showMobileFilters ? 'flex' : 'hidden sm:flex'}`}>
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              filterStatus === 'all' 
                ? 'bg-[var(--accent)] text-white' 
                : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('published')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              filterStatus === 'published' 
                ? 'bg-green-500 text-white' 
                : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]'
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setFilterStatus('draft')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              filterStatus === 'draft' 
                ? 'bg-yellow-500 text-white' 
                : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]'
            }`}
          >
            Draft
          </button>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="space-y-3 sm:hidden">
        {filteredPosts.map((post) => (
          <div key={post.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-[var(--text-primary)] line-clamp-2">{post.title}</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{post.slug}</p>
              </div>
              <div className={`ml-2 h-2 w-2 rounded-full ${post.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/admin/blog/edit/${post.id}`} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--accent)]">
                Edit
              </Link>
              <button
                onClick={() => toggleStatus(post.id, post.status)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]"
              >
                {post.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
              <button
                onClick={() => deletePost(post.id)}
                className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-400"
              >
                Delete
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <SvgIcon name="calendar" size={10} color="var(--text-muted)" />
                {new Date(post.published_at || post.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <SvgIcon name="eye" size={10} color="var(--text-muted)" />
                {post.views || 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] sm:block">
        <table className="min-w-full">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
            <tr>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Title</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Status</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Views</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Date</th>
              <th className="p-4 text-left text-xs font-black uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredPosts.map((post) => (
              <tr key={post.id} className="hover:bg-[var(--bg-section)]/50">
                <td className="p-4">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">{post.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{post.slug}</p>
                    {post.is_featured && (
                      <span className="mt-1 inline-block rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                        Featured
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleStatus(post.id, post.status)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      post.status === 'published' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {post.status === 'published' ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td className="p-4 text-sm text-[var(--text-muted)]">{post.views || 0}</td>
                <td className="p-4 text-sm text-[var(--text-muted)]">
                  {new Date(post.published_at || post.created_at).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Link 
                      href={`/admin/blog/edit/${post.id}`} 
                      className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10"
                    >
                      Edit
                    </Link>
                    <button 
                      onClick={() => deletePost(post.id)} 
                      className="rounded-lg border border-red-500/30 px-3 py-1 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPosts.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
          <SvgIcon name="blog" size={48} color="var(--text-muted)" />
          <p className="mt-4 text-[var(--text-muted)]">No blog posts found</p>
          <Link href="/admin/blog/new" className="mt-4 inline-block text-sm font-bold text-[var(--accent)]">
            Create your first post →
          </Link>
        </div>
      )}
    </div>
  )
}