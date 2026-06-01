'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string
  icon_name?: string
  read_time: string
  author: string
  tags: string[]
  is_active: boolean
  is_featured: boolean
  published_at: string
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Available SVG icons for blog posts
  const availableIcons = [
    'blog', 'growth', 'analytics', 'ecommerce', 'web-development', 
    'branding', 'marketing', 'consulting', 'strategy', 'rocket'
  ]

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('published_at', { ascending: false })
    
    setPosts(data || [])
    setLoading(false)
  }

  async function savePost(e: React.FormEvent) {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    const postData = {
      title: formData.get('title') as string,
      slug: (formData.get('title') as string).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      excerpt: formData.get('excerpt') as string,
      content: formData.get('content') as string,
      featured_image: formData.get('featured_image') as string,
      icon_name: formData.get('icon_name') as string,
      read_time: formData.get('read_time') as string,
      author: formData.get('author') as string,
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()),
      is_active: formData.get('is_active') === 'on',
      is_featured: formData.get('is_featured') === 'on',
      published_at: new Date().toISOString(),
    }

    if (editingPost) {
      await supabase.from('blog_posts').update(postData).eq('id', editingPost.id)
    } else {
      await supabase.from('blog_posts').insert([postData])
    }

    setShowForm(false)
    setEditingPost(null)
    fetchPosts()
  }

  async function deletePost(id: string) {
    if (confirm('Are you sure you want to delete this post?')) {
      await supabase.from('blog_posts').delete().eq('id', id)
      fetchPosts()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[var(--text-primary)]">Blog Management</h1>
            <p className="text-[var(--text-secondary)]">Manage your blog posts, add icons, and control visibility.</p>
          </div>
          <button
            onClick={() => {
              setEditingPost(null)
              setShowForm(true)
            }}
            className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-105"
          >
            + New Post
          </button>
        </div>

        {/* Blog Posts Table */}
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr>
                <th className="p-4 text-left text-sm font-black">Icon</th>
                <th className="p-4 text-left text-sm font-black">Title</th>
                <th className="p-4 text-left text-sm font-black">Author</th>
                <th className="p-4 text-left text-sm font-black">Status</th>
                <th className="p-4 text-left text-sm font-black">Date</th>
                <th className="p-4 text-left text-sm font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-[var(--border)] last:border-none">
                  <td className="p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10">
                      <SvgIcon name={post.icon_name || 'blog'} size={18} color="var(--accent)" />
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{post.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{post.slug}</p>
                    </div>
                  </td>
                  <td className="p-4 text-[var(--text-secondary)]">{post.author || 'Admin'}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${post.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {post.is_active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">
                    {new Date(post.published_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPost(post)
                          setShowForm(true)
                        }}
                        className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10"
                      >
                        Edit
                      </button>
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
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    No blog posts yet. Click "New Post" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[var(--bg-card)] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  {editingPost ? 'Edit Post' : 'New Post'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  ✕
                </button>
              </div>

              <form onSubmit={savePost} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Title *</label>
                  <input
                    name="title"
                    defaultValue={editingPost?.title}
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Featured Image URL</label>
                  <input
                    name="featured_image"
                    defaultValue={editingPost?.featured_image}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Icon</label>
                  <select
                    name="icon_name"
                    defaultValue={editingPost?.icon_name || 'blog'}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                  >
                    {availableIcons.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Excerpt *</label>
                  <textarea
                    name="excerpt"
                    defaultValue={editingPost?.excerpt}
                    required
                    rows={3}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Content (HTML) *</label>
                  <textarea
                    name="content"
                    defaultValue={editingPost?.content}
                    required
                    rows={8}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 font-mono text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Author</label>
                    <input name="author" defaultValue={editingPost?.author || 'Admin'} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Read Time</label>
                    <input name="read_time" defaultValue={editingPost?.read_time || '5 min read'} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Tags (comma separated)</label>
                  <input name="tags" defaultValue={editingPost?.tags?.join(', ')} placeholder="Shopify, Ecommerce, Growth" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_active" defaultChecked={editingPost?.is_active !== false} />
                    <span className="text-sm">Active (published)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_featured" defaultChecked={editingPost?.is_featured} />
                    <span className="text-sm">Featured on homepage</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="rounded-full bg-[var(--accent)] px-6 py-2 font-black text-[var(--btn-primary-text)] transition hover:scale-105">
                    {editingPost ? 'Update Post' : 'Create Post'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-[var(--border)] px-6 py-2 font-black text-[var(--text-muted)]">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}