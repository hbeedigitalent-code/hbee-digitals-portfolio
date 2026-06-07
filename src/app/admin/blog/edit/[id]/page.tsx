'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BlogPostEditor from '@/components/admin/BlogPostEditor'

export default function EditBlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = String(params?.id || '')

  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (postId) fetchPost()
  }, [postId])

  async function fetchPost() {
    setLoading(true)

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (error || !data) {
      alert(error?.message || 'Blog post not found.')
      router.push('/admin/blog')
      return
    }

    setPost(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[var(--text-muted)]">
        Loading blog post...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">
            Edit Blog Post
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Update content, SEO, image, and publishing settings.
          </p>
        </div>

        <div className="flex gap-3">
          {post?.slug && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="rounded-full border border-[var(--border)] px-5 py-2 text-sm font-bold text-[var(--text-primary)]"
            >
              View Post
            </Link>
          )}

          <Link
            href="/admin/blog"
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[#07111F]"
          >
            Back
          </Link>
        </div>
      </div>

      <BlogPostEditor mode="edit" initialPost={post} />
    </div>
  )
}