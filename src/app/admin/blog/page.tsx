'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type BlogPost = {
  id: string
  title: string
  slug: string
  status: string
  post_type: string
  is_featured: boolean
  published_at: string | null
  created_at: string
  featured_image: string | null
  read_time: string | null
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

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
        published_at: newStatus === 'published' ? new Date().toISOString() : post.published_at,
      })
      .eq('id', post.id)

    if (error) {
      alert(error.message)
      return
    }

    fetchPosts()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Blog Posts</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create, edit, and publish Hbee Digitals growth articles.
          </p>
        </div>

        <Link
          href="/admin/blog/new"
          className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[#07111F]"
        >
          New Blog Post
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-muted)]">No blog posts yet.</p>
            <Link
              href="/admin/blog/new"
              className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[#07111F]"
            >
              Create First Post
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[var(--bg-section)] text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-4">Post</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Featured</th>
                  <th className="px-5 py-4">Read Time</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t border-[var(--border)]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-section)]">
                          {post.featured_image && (
                            <img
                              src={post.featured_image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>

                        <div>
                          <p className="font-black text-[var(--text-primary)]">{post.title}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">/{post.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold capitalize text-[var(--accent)]">
                        {post.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {post.is_featured ? 'Yes' : 'No'}
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {post.read_time || '—'}
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {new Date(post.published_at || post.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-3 text-sm font-bold">
                        <Link href={`/blog/${post.slug}`} target="_blank" className="text-[var(--accent)]">
                          View
                        </Link>

                        <Link href={`/admin/blog/edit/${post.id}`} className="text-[var(--text-primary)]">
                          Edit
                        </Link>

                        <button onClick={() => toggleStatus(post)} className="text-[var(--accent)]">
                          {post.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>

                        <button onClick={() => deletePost(post.id)} className="text-red-500">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}