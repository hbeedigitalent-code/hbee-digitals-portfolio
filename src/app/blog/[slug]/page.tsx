import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Metadata } from 'next'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'
import BlogReadingTools from '@/components/blog/BlogReadingTools'
import BlogTableOfContents from '@/components/blog/BlogTableOfContents'
import BlogAuthorBio from '@/components/blog/BlogAuthorBio'
import RelatedPosts from '@/components/blog/RelatedPosts'

export const revalidate = 60

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content?: string
  featured_image?: string
  status: string
  created_at: string
  published_at?: string
  read_time?: string
  author_id?: string
  tags?: string[] | string
  cta_text?: string
  cta_link?: string
  seo_title?: string
  seo_description?: string
  focus_keyword?: string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  post_type?: string
}

interface Author {
  id: string
  name: string
  role: string
  bio: string
  avatar_url: string
  linkedin_url?: string
  twitter_url?: string
}

interface PageProps {
  params: {
    slug: string
  }
}

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value.split(',').map(t => t.trim()).filter(Boolean)
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

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data } = await supabase
    .from('blog_posts')
    .select('seo_title, seo_description, og_title, og_description, og_image, featured_image, title, excerpt, canonical_url')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!data) {
    return {
      title: 'Article Not Found | Hbee Digitals',
      description: 'The requested article could not be found.',
    }
  }

  return {
    title: data.seo_title || data.title,
    description: data.seo_description || data.excerpt?.slice(0, 160),
    openGraph: {
      title: data.og_title || data.title,
      description: data.og_description || data.excerpt?.slice(0, 200),
      images: [{ url: data.og_image || data.featured_image || '/og-image.jpg' }],
      type: 'article',
    },
    alternates: {
      canonical: data.canonical_url || undefined,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  // Fetch post with author data
  const { data: postData } = await supabase
    .from('blog_posts')
    .select(`
      *,
      author:blog_authors(*)
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (!postData) notFound()

  const post = postData as BlogPost & { author: Author | null }
  const tags = normalizeArray(post.tags)

  // Track view - use the RPC function if available, otherwise insert directly
  try {
    await supabase.rpc('increment_blog_view', { post_id: post.id })
  } catch {
    // Fallback if RPC doesn't exist
    await supabase
      .from('blog_analytics')
      .insert([{ post_id: post.id, event_type: 'view' }])
  }

  // Fetch related posts
  const { data: relatedData } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, read_time, post_type')
    .eq('status', 'published')
    .neq('id', post.id)
    .limit(3)

  const relatedPosts = relatedData || []

  const isCaseStudy = post.post_type === 'case_study'

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[var(--bg-page)] pb-16 text-[var(--text-primary)]">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[var(--accent-lime)]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        {/* Hero Section */}
        <section className="px-5 pb-10 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pt-36">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/blog"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)]/25 hover:text-[var(--text-primary)]"
            >
              <SvgIcon name="chevron-left" size={14} color="var(--accent)" />
              Back to {isCaseStudy ? 'Case Studies' : 'Blog'}
            </Link>

            {isCaseStudy && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-purple-400">
                <SvgIcon name="portfolio" size={14} color="#a855f7" />
                Case Study
              </div>
            )}

            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              <SvgIcon name="blog" size={14} color="var(--accent)" />
              {isCaseStudy ? 'Client Success Story' : 'Growth Insight'}
            </p>

            <h1 className="max-w-6xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl lg:text-7xl">
              <GradientHeading>{post.title}</GradientHeading>
            </h1>

            {post.excerpt && (
              <p className="mt-7 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                {post.excerpt}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {formatDate(post.published_at || post.created_at)}
              </span>

              {post.author && (
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  By {post.author.name}
                </span>
              )}

              {post.read_time && (
                <span className="rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                  {post.read_time}
                </span>
              )}
            </div>

            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--accent)]/16 bg-[var(--accent)]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--accent)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Image */}
        {post.featured_image && (
          <section className="px-5 pb-14 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-lg)]">
              <img
                src={post.featured_image}
                alt={post.title}
                className="aspect-[16/9] w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </section>
        )}

        {/* Article Content with TOC */}
        <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[72px_minmax(0,820px)_320px]">
            <BlogReadingTools title={post.title} />

            <article className="min-w-0 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)]/78 p-6 shadow-[var(--shadow-md)] sm:p-8 lg:p-10">
              {/* Table of Contents - Mobile/Tablet */}
              <div className="mb-8 lg:hidden">
                <BlogTableOfContents content={post.content || ''} />
              </div>

              <div
                className="blog-content
                  text-[16px] leading-8 text-[var(--text-secondary)] sm:text-[17px]
                  [&>*:first-child]:mt-0
                  [&_h1]:mt-12 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:tracking-[-0.04em] [&_h1]:text-[var(--text-primary)]
                  [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:leading-tight [&_h2]:tracking-[-0.04em] [&_h2]:text-[var(--text-primary)]
                  [&_h3]:mt-10 [&_h3]:scroll-mt-24 [&_h3]:text-2xl [&_h3]:font-black [&_h3]:text-[var(--text-primary)]
                  [&_p]:mt-5 [&_p]:leading-8 [&_p]:text-[var(--text-secondary)]
                  [&_strong]:font-black [&_strong]:text-[var(--text-primary)]
                  [&_a]:font-bold [&_a]:text-[var(--accent)] [&_a]:underline
                  [&_ul]:mt-5 [&_ul]:space-y-3 [&_ul]:pl-5
                  [&_ol]:mt-5 [&_ol]:space-y-3 [&_ol]:pl-5
                  [&_li]:pl-2 [&_li]:leading-8 [&_li]:text-[var(--text-secondary)]
                  [&_blockquote]:mt-8 [&_blockquote]:rounded-[1.5rem] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--accent)] [&_blockquote]:bg-[var(--bg-section)] [&_blockquote]:p-6 [&_blockquote]:text-[var(--text-secondary)]
                  [&_img]:mt-8 [&_img]:rounded-[1.5rem] [&_img]:border [&_img]:border-[var(--border)]
                "
                dangerouslySetInnerHTML={{
                  __html:
                    post.content ||
                    '<p>This article is being prepared. Check back soon for the full insight.</p>',
                }}
              />

              {/* Author Bio */}
              {post.author && (
                <BlogAuthorBio author={post.author} />
              )}

              {/* CTA */}
              <div className="mt-10 rounded-[1.7rem] border border-[var(--accent)]/18 bg-[var(--accent)]/10 p-6 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  Ready to improve your digital system?
                </p>
                <h3 className="mt-3 text-2xl font-black text-[var(--text-primary)]">
                  Let's turn your website into a stronger growth foundation.
                </h3>
                <Link
                  href={post.cta_link || '/contact'}
                  className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-orange-green px-8 py-3 text-sm font-black text-white transition hover:scale-105"
                >
                  {post.cta_text || 'Start A Project'}
                  <SvgIcon name="arrow-diagonal" size={14} color="white" />
                </Link>
              </div>
            </article>

            {/* Desktop Sidebar - TOC */}
            <aside className="hidden lg:block">
              <div className="sticky top-32">
                <BlogTableOfContents content={post.content || ''} />
                
                <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                    Share this article
                  </p>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://hbeedigitals.com/blog/${post.slug}`)}&text=${encodeURIComponent(post.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] transition hover:border-[var(--accent)]/25"
                    >
                      <SvgIcon name="twitter" size={16} color="var(--accent)" />
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://hbeedigitals.com/blog/${post.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] transition hover:border-[var(--accent)]/25"
                    >
                      <SvgIcon name="linkedin" size={16} color="var(--accent)" />
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <RelatedPosts posts={relatedPosts} />
      </main>

      <Footer />
    </>
  )
}