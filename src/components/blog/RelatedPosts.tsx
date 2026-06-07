'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image: string | null
  tags: string[] | null
  author: string | null
  published_at: string | null
  read_time: string | null
}

interface RelatedPostsProps {
  currentSlug: string
  tags?: string[] | null
}

export default function RelatedPosts({ currentSlug, tags }: RelatedPostsProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRelated() {
      setLoading(true)

      // First try: get posts with matching tags
      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, tags, author, published_at, read_time')
        .eq('status', 'published')
        .neq('slug', currentSlug)
        .order('published_at', { ascending: false })
        .limit(3)

      // If we have tags, filter by them
      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags)
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        // Fallback: just get latest published posts
        const { data: fallbackData } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, featured_image, tags, author, published_at, read_time')
          .eq('status', 'published')
          .neq('slug', currentSlug)
          .order('published_at', { ascending: false })
          .limit(3)

        setPosts(fallbackData || [])
      } else {
        setPosts(data)
      }

      setLoading(false)
    }

    fetchRelated()
  }, [currentSlug, tags])

  if (loading) {
    return (
      <section className="mt-16">
        <h3 className="mb-6 text-xl font-black text-[var(--text-primary)]">Related Articles</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-[var(--bg-card)]" />
          ))}
        </div>
      </section>
    )
  }

  if (posts.length === 0) return null

  return (
    <section className="mt-16">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
        <img src="/svgs/blog.svg" alt="" className="h-5 w-5 opacity-60" />
        Related Articles
      </h3>

      <div className="grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:-translate-y-1 hover:border-[#39D97A]/30 hover:shadow-lg"
          >
            {post.featured_image && (
              <div className="relative aspect-[16/10] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col p-5">
              {post.tags && post.tags.length > 0 && (
                <span className="mb-2 text-xs font-bold uppercase tracking-wider text-[#39D97A]">
                  {post.tags[0]}
                </span>
              )}

              <h4 className="text-sm font-bold leading-snug text-[var(--text-primary)] group-hover:text-[#39D97A] transition">
                {post.title}
              </h4>

              {post.read_time && (
                <span className="mt-auto flex items-center gap-1 pt-3 text-xs text-[var(--text-muted)]">
                  <img src="/svgs/clock.svg" alt="" className="h-3 w-3 opacity-50" />
                  {post.read_time}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}