'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PageUtilities from '@/components/ui/PageUtilities'
import BlogNewsletterSignup from '@/components/blog/BlogNewsletterSignup'
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

interface Comment {
  id: string
  post_slug: string
  author_name: string
  author_email?: string
  content: string
  is_approved: boolean
  created_at: string
}

function formatDate(date?: string) {
  if (!date) return ''

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim()
}

function decodeHtml(value: string) {
  if (typeof window === 'undefined') return value

  const textarea = document.createElement('textarea')
  textarea.innerHTML = value
  return textarea.value
}

function cleanBlogHtml(raw: string) {
  if (!raw) return '<p>Content coming soon...</p>'

  let html = raw.trim()

  html = html.replace(/^```html/i, '')
  html = html.replace(/^```/i, '')
  html = html.replace(/```$/i, '')
  html = html.trim()

  if (html.includes('&lt;') || html.includes('&gt;')) {
    html = decodeHtml(html)
  }

  html = html.replace(/<pre[^>]*><code[^>]*>/gi, '')
  html = html.replace(/<\/code><\/pre>/gi, '')
  html = html.replace(/<article[^>]*>/gi, '')
  html = html.replace(/<\/article>/gi, '')
  html = html.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  html = html.replace(/<p>\s*\.\.\.\s*<\/p>/gi, '')
  html = html.replace(/\n\s*\.\.\.\s*\n/g, '\n')

  return html
}

function generateTableOfContents(html: string) {
  const matches = [...html.matchAll(/<h([2-3])[^>]*>(.*?)<\/h[2-3]>/gi)]

  return matches.map((match, index) => {
    const text = stripHtml(match[2])
    const id =
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `section-${index + 1}`

    return { id, text, level: Number(match[1]) }
  })
}

function addHeadingIds(html: string) {
  return html.replace(
    /<h([2-3])([^>]*)>(.*?)<\/h[2-3]>/gi,
    (match, level, attrs, content) => {
      if (attrs.includes('id=')) return match

      const text = stripHtml(content)
      const id =
        text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'section'

      return `<h${level}${attrs} id="${id}">${content}</h${level}>`
    }
  )
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = String(params?.slug || '')

  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
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
      console.error('Blog fetch error:', error)
      setPost(null)
      setLoading(false)
      return
    }

    setPost(data)

    const { data: related } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .eq('post_type', 'blog')
      .neq('id', data.id)
      .limit(3)

    setRelatedPosts(related || [])
    setLoading(false)
  }

  async function fetchComments() {
    const { data } = await supabase
      .from('blog_comments')
      .select('*')
      .eq('post_slug', slug)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    setComments(data || [])
  }

  async function submitComment(event: React.FormEvent) {
    event.preventDefault()

    if (!commentText.trim()) {
      setCommentStatus('error')
      return
    }

    setCommentStatus('submitting')

    const { error } = await supabase.from('blog_comments').insert({
      post_slug: slug,
      author_name: commentName.trim() || 'Anonymous',
      author_email: commentEmail.trim() || null,
      content: commentText.trim(),
      is_approved: false,
    })

    if (error) {
      console.error('Comment submit error:', error)
      setCommentStatus('error')
      return
    }

    setCommentName('')
    setCommentEmail('')
    setCommentText('')
    setCommentStatus('success')

    setTimeout(() => setCommentStatus('idle'), 3500)
  }

  const cleanedContent = useMemo(() => cleanBlogHtml(post?.content || ''), [post?.content])
  const contentWithIds = useMemo(() => addHeadingIds(cleanedContent), [cleanedContent])
  const toc = useMemo(() => generateTableOfContents(cleanedContent), [cleanedContent])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = post?.title || ''

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
          <h1 className="text-4xl font-black text-[var(--text-primary)]">
            Article not found
          </h1>

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

      <main className="bg-[var(--bg-page)] text-[var(--text-primary)]">
        <section className="px-5 pb-8 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-[980px]">
            <div className="mb-5 flex flex-wrap gap-3">
              {post.tags?.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-black uppercase tracking-[0.12em] text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="max-w-[850px] text-3xl font-black leading-tight tracking-[-0.045em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 max-w-[760px] text-base leading-8 text-[var(--text-secondary)]">
                {post.excerpt}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">
                  {post.author || 'Hbee Digitals'}
                </p>

                <p className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                  Updated on {formatDate(post.published_at || post.created_at)}
                  {post.read_time ? ` · ${post.read_time}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={copyLink} className="share-icon" aria-label="Copy link">
                  <img src="/svgs/link.svg" alt="" />
                </button>

                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    shareTitle
                  )}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-icon"
                  aria-label="Share on X"
                >
                  <img src="/svgs/twitter.svg" alt="" />
                </a>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    shareUrl
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-icon"
                  aria-label="Share on Facebook"
                >
                  <img src="/svgs/facebook.svg" alt="" />
                </a>

                <a
                  href="https://www.instagram.com/thehbeedigitals"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-icon"
                  aria-label="Visit Instagram"
                >
                  <img src="/svgs/instagram.svg" alt="" />
                </a>

                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                    shareUrl
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="share-icon"
                  aria-label="Share on LinkedIn"
                >
                  <img src="/svgs/linkedin.svg" alt="" />
                </a>
              </div>
            </div>

            {copied && (
              <p className="mt-3 text-xs font-bold text-[var(--accent)]">
                Link copied
              </p>
            )}
          </div>
        </section>

        {post.featured_image && (
          <section className="px-5 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-[980px] overflow-hidden rounded-2xl bg-[var(--bg-section)] shadow-xl shadow-black/5">
              <img
                src={post.featured_image}
                alt={post.featured_image_alt || post.title}
                className="aspect-[1200/630] h-full w-full object-cover"
              />
            </div>
          </section>
        )}

        <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-[980px] gap-10 lg:grid-cols-[1fr_230px]">
            <article className="min-w-0">
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: contentWithIds }}
              />

              <div className="mt-16 border-t border-[var(--border)] pt-8">
                <div className="flex items-center justify-end gap-3">
                  <button onClick={copyLink} className="share-icon" aria-label="Copy link">
                    <img src="/svgs/link.svg" alt="" />
                  </button>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      shareTitle
                    )}&url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-icon"
                    aria-label="Share on X"
                  >
                    <img src="/svgs/twitter.svg" alt="" />
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      shareUrl
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-icon"
                    aria-label="Share on Facebook"
                  >
                    <img src="/svgs/facebook.svg" alt="" />
                  </a>

                  <a
                    href="https://www.instagram.com/thehbeedigitals"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-icon"
                    aria-label="Visit Instagram"
                  >
                    <img src="/svgs/instagram.svg" alt="" />
                  </a>

                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                      shareUrl
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-icon"
                    aria-label="Share on LinkedIn"
                  >
                    <img src="/svgs/linkedin.svg" alt="" />
                  </a>
                </div>
              </div>

              <BlogNewsletterSignup />
            </article>

            {toc.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-28 border-l border-[var(--border)] pl-5">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                    Contents
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
          </div>
        </section>

        <section className="bg-[var(--bg-section)] px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="text-3xl font-black text-[var(--text-primary)]">
              Leave a comment
            </h2>

            <form onSubmit={submitComment} className="mt-8 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <input
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="blog-input"
                  placeholder="Name"
                />

                <input
                  value={commentEmail}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  className="blog-input"
                  placeholder="Email"
                  type="email"
                />
              </div>

              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="blog-input min-h-[150px]"
                placeholder="Comment"
              />

              <p className="text-xs text-[var(--text-muted)]">
                Please note, comments need to be approved before they are published.
              </p>

              <button
                type="submit"
                disabled={commentStatus === 'submitting'}
                className="mx-auto rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[#07111F]"
              >
                {commentStatus === 'submitting' ? 'Submitting...' : 'Post comment'}
              </button>

              {commentStatus === 'success' && (
                <p className="text-sm font-bold text-[var(--accent)]">
                  Comment submitted. It will appear after approval.
                </p>
              )}

              {commentStatus === 'error' && (
                <p className="text-sm font-bold text-red-500">
                  Please write a comment before submitting.
                </p>
              )}
            </form>

            {comments.length > 0 && (
              <div className="mt-10 space-y-4 text-left">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
                  >
                    <p className="font-black text-[var(--text-primary)]">
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
            )}
          </div>
        </section>

        <section className="bg-[#07111F] px-5 py-14 text-white sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-[980px] gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-black">Need help improving your store?</h2>

              <p className="mt-4 text-sm leading-7 text-white/75">
                Hbee Digitals helps businesses improve trust, user experience,
                conversion flow, and growth systems that turn visitors into customers.
              </p>

              <Link
                href="/contact"
                className="mt-6 inline-flex rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#07111F]"
              >
                Request a Growth Review
              </Link>
            </div>

            {post.featured_image && (
              <img
                src={post.featured_image}
                alt=""
                className="aspect-[16/9] w-full rounded-2xl object-cover opacity-85"
              />
            )}
          </div>
        </section>

        {relatedPosts.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-[980px]">
              <h2 className="mb-8 text-3xl font-black text-[var(--text-primary)]">
                Read Next
              </h2>

              <div className="grid gap-6 md:grid-cols-3">
                {relatedPosts.map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="group">
                    <article>
                      <img
                        src={item.featured_image || '/placeholder-blog.jpg'}
                        alt={item.featured_image_alt || item.title}
                        className="aspect-[16/9] w-full rounded-xl object-cover"
                      />

                      <h3 className="mt-4 line-clamp-2 text-base font-black text-[var(--text-primary)] transition group-hover:text-[var(--accent)]">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-xs font-bold text-[var(--text-muted)]">
                        {item.author || 'Hbee Digitals'}
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Updated on {formatDate(item.published_at || item.created_at)}
                      </p>
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
        .share-icon {
          display: inline-flex;
          height: 34px;
          width: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          transition: 0.2s ease;
        }

        .share-icon:hover {
          background: var(--bg-section);
        }

        .share-icon img {
          height: 18px;
          width: 18px;
          object-fit: contain;
        }

        .blog-content {
          max-width: 720px;
          color: var(--text-primary);
          font-size: 16px;
          line-height: 1.85;
        }

        .blog-content h1,
        .blog-content h2,
        .blog-content h3 {
          color: var(--text-primary);
          font-weight: 900;
          letter-spacing: -0.035em;
          line-height: 1.22;
          scroll-margin-top: 120px;
        }

        .blog-content h1 {
          font-size: 36px;
          margin: 0 0 28px;
        }

        .blog-content h2 {
          font-size: 25px;
          margin: 44px 0 16px;
        }

        .blog-content h3 {
          font-size: 20px;
          margin: 32px 0 12px;
        }

        .blog-content p {
          margin: 0 0 22px;
          color: var(--text-secondary);
        }

        .blog-content ul,
        .blog-content ol {
          margin: 0 0 28px 22px;
          color: var(--text-secondary);
        }

        .blog-content li {
          margin-bottom: 12px;
          padding-left: 6px;
        }

        .blog-content a {
          color: var(--accent);
          font-weight: 800;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        .blog-content img {
          margin: 32px 0;
          width: 100%;
          border-radius: 16px;
        }

        .blog-content blockquote {
          margin: 32px 0;
          border-left: 4px solid var(--accent);
          background: var(--bg-section);
          padding: 20px 24px;
          color: var(--text-primary);
          font-weight: 700;
        }

        .blog-content pre,
        .blog-content code {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .blog-input {
          width: 100%;
          border-radius: 18px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          padding: 14px 18px;
          color: var(--text-primary);
          outline: none;
        }

        .blog-input:focus {
          border-color: var(--accent);
        }

        @media (max-width: 768px) {
          .blog-content {
            max-width: 100%;
            font-size: 15.5px;
          }

          .blog-content h1 {
            font-size: 30px;
          }

          .blog-content h2 {
            font-size: 22px;
          }
        }
      `}</style>
    </>
  )
}