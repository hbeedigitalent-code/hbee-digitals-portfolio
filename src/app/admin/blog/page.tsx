'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  featured_image?: string
  status: string
  published_at?: string
  read_time?: string
  author?: string
  tags?: string[] | string
  is_featured?: boolean
  created_at: string
}

function normalizeArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
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

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }

  async function toggleFeatured(id: string, current?: boolean) {
    await supabase
      .from('blog_posts')
      .update({ is_featured: !current })
      .eq('id', id)

    fetchPosts()
  }

  async function toggleStatus(id: string, current: string) {
    await supabase
      .from('blog_posts')
      .update({
        status: current === 'published' ? 'draft' : 'published',
      })
      .eq('id', id)

    fetchPosts()
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return

    await supabase.from('blog_posts').delete().eq('id', id)

    fetchPosts()
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600">
        Loading blog posts...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Blog Management
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Publish authority content and SEO-focused growth insights.
          </p>
        </div>

        <Link
          href="/admin/blog/new"
          className="w-fit rounded-lg px-4 py-2 text-white hover:opacity-90"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          + New Article
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <div className="mb-4 text-6xl">📝</div>

          <p className="text-gray-500">
            No blog posts yet. Create your first authority article.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="grid gap-0 divide-y">
            {posts.map((post) => (
              <div
                key={post.id}
                className="grid gap-4 p-5 transition hover:bg-gray-50 md:grid-cols-[90px_1fr_auto]"
              >
                <div>
                  {post.featured_image ? (
                    <div className="h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
                      <Image
                        src={post.featured_image}
                        alt={post.title}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
                      📝
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-800">
                      {post.title}
                    </h3>

                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        post.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {post.status}
                    </span>

                    {post.is_featured && (
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm leading-6 text-gray-600">
                    {post.excerpt || 'No excerpt added yet.'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                      /blog/{post.slug}
                    </span>

                    {post.read_time && (
                      <span className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700">
                        {post.read_time}
                      </span>
                    )}

                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                      {formatDate(post.published_at || post.created_at)}
                    </span>

                    {normalizeArray(post.tags)
                      .slice(0, 3)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-green-100 px-2 py-1 text-xs text-green-700"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-2 md:justify-end">
                  <button
                    onClick={() =>
                      toggleFeatured(post.id, post.is_featured)
                    }
                    className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                  >
                    {post.is_featured ? 'Unfeature' : 'Feature'}
                  </button>

                  <button
                    onClick={() =>
                      toggleStatus(post.id, post.status)
                    }
                    className="rounded bg-yellow-100 px-3 py-1 text-sm text-yellow-700 hover:bg-yellow-200"
                  >
                    {post.status === 'published'
                      ? 'Draft'
                      : 'Publish'}
                  </button>

                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="rounded bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={() => deletePost(post.id)}
                    className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}