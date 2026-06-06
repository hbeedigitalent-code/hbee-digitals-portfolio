'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PageUtilities from '@/components/ui/PageUtilities'
import { supabase } from '@/lib/supabase'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  featured_image?: string
  featured_image_alt?: string
  published_at?: string
  created_at?: string
  read_time?: string
  author?: string
  tags?: string[]
  status?: string
  post_type?: string
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  featured_image?: string
  featured_image_alt?: string
  published_at?: string
  read_time?: string
  tags?: string[]
}

interface Comment {
  id: string
  author_name: string
  content: string
  created_at: string
}

function formatDate(date?: string) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim()
}

function generateTableOfContents(html: string) {
  if (!html) return []

  const matches = [...html.matchAll(/<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi)]

  return matches.map((match, index) => {
    const text = stripHtml(match[2])
    const id =
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `section-${index + 1}`

    return {
      id,
      text,
      level: Number(match[1]),
    }
  })
}

function addHeadingIds(html: string) {
  if (!html) return '<p>Content coming soon...</p>'

  return html.replace(/<h([2-3])([^>]*)>(.*?)<\/h[2-3]>/gi, (match, level, attrs, content) => {
    const text = stripHtml(content)
    const id =
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'section'

    if (attrs.includes('id=')) return match

    return `<h${level}${attrs} id="${id}">${content}</h${level}>`
  })
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = String(params?.slug || '')

  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const [commentName, setCommentName] = useState('')
  const [commentEmail, setCommentEmail] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentStatus, setCommentStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')

  useEffect(() => {
    if (!slug) return

    fetchPost()
    fetchComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function fetchPost() {
    setLoading(true)

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      console.error('Blog post fetch error:', error)
      setPost(null)
      setLoading(false)
      return
    }

    setPost(data)

    const { data: related } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image, featured_image_alt, published_at, read_time, tags')
      .eq('status', 'published')
      .eq('post_type', 'blog')
      .neq('id', data.id)
      .limit(3)

    setRelatedPosts(related || [])
    setLoading(false)
  }

  async function fetchComments() {
    const { data, error } = await supabase
      .from('blog_comments')
      .select('*')
      .eq('post_slug', slug)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Comments fetch error:', error)
      return
    }

    setComments(data || [])
  }

  async function handleComment(event: React.FormEvent) {
    event.preventDefault()

    if (!commentText.trim()) {
      setCommentStatus('error')
      setTimeout(() => setCommentStatus('idle'), 3000)
      return
    }

    setCommentStatus('submitting')

    const { error } = await supabase.from('blog_comments').insert({
      post_slug: slug,
      author_name: commentName.trim() || 'Anonymous',
      author_email: commentEmail.trim() || null,
      content: commentText.trim(),
      is_approved: false,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Comment submit error:', error)
      setCommentStatus('error')
      setTimeout(() => setCommentStatus('idle'), 3000)
      return
    }

    setCommentStatus('success')
    setCommentName('')
    setCommentEmail('')
    setCommentText('')
    setTimeout(() => setCommentStatus('idle'), 4000)
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = post?.title || ''

  const contentWithIds = useMemo(() => addHeadingIds(post?.content || ''), [post?.content])
  const toc = useMemo(() => generateTableOfContents(post?.content || ''), [post?.content])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </main>
        <Footer />
        <PageUtilities />
      </>
    )
  }

  if (!post) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)] px-5 text-center">
          <h1 className="text-4xl font-black text-[var(--text-primary)]">Article not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This article may have been moved, unpublished, or deleted.
          </p>
          <Link
            href="/blog"
            className="mt-8 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[#07111F]"
          >
            Back to Blog
          </Link>
        </main>
        <Footer />
        <PageUtilities />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="bg-[var(--bg-page)]">
        <section className="px-5 pb-10 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              {post.tags?.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-[-0.05em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                {post.excerpt}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-sm text-[var(--text-muted)]">
              <span className="flex items-center gap-2">
                <img src="/svgs/calendar.svg" alt="" className="h-4 w-4" />
                {formatDate(post.published_at || post.created_at)}
              </span>

              {post.read_time && (
                <span className="flex items-center gap-2">
                  <img src="/svgs/clock.svg" alt="" className="h-4 w-4" />
                  {post.read_time}
                </span>
              )}

              {post.author && (
                <span className="flex items-center gap-2">
                  <img src="/svgs/user.svg" alt="" className="h-4 w-4" />
                  By {post.author}
                </span>
              )}
            </div>
          </div>
        </section>

        {post.featured_image && (
          <section className="px-5 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
              <div className="aspect-[1200/630] overflow-hidden">
                <img
                  src={post.featured_image}
                  alt={post.featured_image_alt || post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </section>
        )}

        <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[260px_1fr]">
            {toc.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-28 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                    Table of Contents
                  </p>

                  <nav className="space-y-3">
                    {toc.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`block text-sm leading-6 text-[var(--text-secondary)] transition hover:text-[var(--accent)] ${
                          item.level === 3 ? 'pl-4' : ''
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            <article className="min-w-0">
              <div
                className="blog-content rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 text-[var(--text-primary)] shadow-xl sm:p-8 lg:p-10"
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
              />

              <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                <p className="mb-4 text-sm font-black text-[var(--text-primary)]">Share this article</p>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    WhatsApp
                  </a>

                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    LinkedIn
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    Twitter
                  </a>

                  <button
                    onClick={copyToClipboard}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-2xl font-black text-[var(--text-primary)]">Leave a comment</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Your comment will appear after approval.
                </p>

                <form onSubmit={handleComment} className="mt-6 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      placeholder="Your name"
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />

                    <input
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      placeholder="Email address"
                      type="email"
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write your comment..."
                    rows={5}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />

                  <button
                    disabled={commentStatus === 'submitting'}
                    className="w-fit rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[#07111F]"
                  >
                    {commentStatus === 'submitting' ? 'Submitting...' : 'Submit Comment'}
                  </button>

                  {commentStatus === 'success' && (
                    <p className="text-sm font-bold text-[var(--accent)]">
                      Comment submitted successfully. It will appear after approval.
                    </p>
                  )}

                  {commentStatus === 'error' && (
                    <p className="text-sm font-bold text-red-500">
                      Please write a comment before submitting.
                    </p>
                  )}
                </form>
              </div>

              {comments.length > 0 && (
                <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">
                    Comments
                  </h2>

                  <div className="mt-6 space-y-4">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4"
                      >
                        <p className="font-bold text-[var(--text-primary)]">
                          {comment.author_name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {formatDate(comment.created_at)}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                          {comment.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>
        </section>

        {relatedPosts.length > 0 && (
          <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <h2 className="mb-8 text-3xl font-black text-[var(--text-primary)]">
                Related Articles
              </h2>

              <div className="grid gap-8 md:grid-cols-3">
                {relatedPosts.map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="group">
                    <article className="h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] transition hover:-translate-y-1 hover:shadow-xl">
                      <div className="aspect-[1200/630] overflow-hidden">
                        <img
                          src={item.featured_image || '/placeholder-blog.jpg'}
                          alt={item.featured_image_alt || item.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      </div>

                      <div className="p-5">
                        <h3 className="line-clamp-2 text-lg font-black text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                          {item.title}
                        </h3>

                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                          {item.excerpt}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
      <PageUtilities />

      <style jsx global>{`
        .blog-content {
          font-size: 1.05rem;
          line-height: 1.85;
        }

        .blog-content h1,
        .blog-content h2,
        .blog-content h3 {
          color: var(--text-primary);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.2;
          scroll-margin-top: 110px;
        }

        .blog-content h1 {
          font-size: 2.6rem;
          margin: 0 0 1.5rem;
        }

        .blog-content h2 {
          font-size: 2rem;
          margin: 3rem 0 1rem;
        }

        .blog-content h3 {
          font-size: 1.35rem;
          margin: 2rem 0 0.75rem;
        }

        .blog-content p {
          color: var(--text-secondary);
          margin: 1rem 0;
        }

        .blog-content a {
          color: var(--accent);
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .blog-content ul,
        .blog-content ol {
          margin: 1.25rem 0;
          padding-left: 1.4rem;
          color: var(--text-secondary);
        }

        .blog-content li {
          margin: 0.7rem 0;
          padding-left: 0.25rem;
        }

        .blog-content blockquote {
          margin: 2rem 0;
          border-left: 4px solid var(--accent);
          background: var(--bg-section);
          padding: 1.25rem 1.5rem;
          border-radius: 1rem;
          color: var(--text-primary);
          font-weight: 700;
        }

        .blog-content img {
          width: 100%;
          border-radius: 1.25rem;
          margin: 2rem 0;
        }

        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 2rem 0;
          overflow: hidden;
          border-radius: 1rem;
        }

        .blog-content th,
        .blog-content td {
          border: 1px solid var(--border);
          padding: 0.9rem;
          text-align: left;
        }

        .blog-content th {
          background: var(--bg-section);
          color: var(--text-primary);
          font-weight: 900;
        }

        .blog-content code {
          background: var(--bg-section);
          border: 1px solid var(--border);
          border-radius: 0.4rem;
          padding: 0.15rem 0.35rem;
          font-size: 0.9em;
        }

        .blog-content pre {
          background: #07111f;
          color: #ffffff;
          padding: 1.25rem;
          border-radius: 1rem;
          overflow-x: auto;
          margin: 2rem 0;
        }
      `}</style>
    </>
  )
}