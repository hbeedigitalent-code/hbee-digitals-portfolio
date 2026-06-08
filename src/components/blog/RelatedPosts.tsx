'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  featured_image: string | null
  featured_image_alt?: string | null
  tags: string[] | null
  author: string | null
  published_at: string | null
  read_time: string | null
}

interface RelatedPostsProps {
  currentSlug: string
  tags?: string[] | null
}

function formatDate(date?: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function IconMask({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMask: `url(/svgs/${name}.svg) center / contain no-repeat`,
        mask: `url(/svgs/${name}.svg) center / contain no-repeat`,
      }}
    />
  )
}

export default function RelatedPosts({ currentSlug, tags }: RelatedPostsProps) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRelated() {
      setLoading(true)

      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, published_at, read_time')
        .eq('status', 'published')
        .neq('slug', currentSlug)
        .order('published_at', { ascending: false })
        .limit(3)

      if (tags && tags.length > 0) {
        query = query.overlaps('tags', tags)
      }

      const { data, error } = await query

      if (error || !data || data.length === 0) {
        const { data: fallbackData } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, featured_image, featured_image_alt, tags, author, published_at, read_time')
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
        <h3 className="mb-6 text-xl font-black text-[var(--text-primary)]">
          Related Articles
        </h3>

        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl bg-[var(--bg-card)]"
            />
          ))}
        </div>
      </section>
    )
  }

  if (posts.length === 0) return null

  return (
    <section className="mt-16">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
        <span className="text-[var(--accent)]">
          <IconMask name="blog" className="h-5 w-5" />
        </span>
        Related Articles
      </h3>

      <div className="grid gap-6 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-lg"
          >
            <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)]">
              {post.featured_image ? (
                <img
                  src={post.featured_image}
                  alt={post.featured_image_alt || post.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                  <IconMask name="blog" className="h-8 w-8" />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              {post.tags && post.tags.length > 0 && (
                <span className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--accent)]">
                  {post.tags[0]}
                </span>
              )}

              <h4 className="line-clamp-2 text-base font-black leading-snug text-[var(--text-primary)] transition group-hover:text-[var(--accent)]">
                {post.title}
              </h4>

              {post.excerpt && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {post.excerpt}
                </p>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-xs text-[var(--text-muted)]">
                <span>{post.author || 'Hbee Digitals'}</span>

                <span>{formatDate(post.published_at)}</span>

                {post.read_time && (
                  <span className="flex items-center gap-1">
                    <IconMask name="clock" className="h-3 w-3" />
                    {post.read_time}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}