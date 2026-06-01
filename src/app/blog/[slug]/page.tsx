import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'
import BlogReadingTools from '@/components/blog/BlogReadingTools'
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
  author?: string
  tags?: string[] | string
  cta_text?: string
  cta_link?: string
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

export default async function BlogPostPage({ params }: PageProps) {
  const { data } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!data) notFound()

  const post: BlogPost = data
  const tags = normalizeArray(post.tags)

  const { data: relatedData } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image, read_time')
    .eq('status', 'published')
    .neq('id', post.id)
    .limit(3)

  const relatedPosts = relatedData || []

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[var(--bg-page)] pb-16 text-[var(--text-primary)]">
        {/* Background decorative elements */}
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
              Back to Blog
            </Link>

            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              <SvgIcon name="blog" size={14} color="var(--accent)" />
              Growth Insight
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

              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {post.author || 'Hbee Digitals'}
              </span>

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

        {/* Article Content */}
        <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[72px_minmax(0,820px)_1fr]">
            <BlogReadingTools title={post.title} />

            <article className="min-w-0 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)]/78 p-6 shadow-[var(--shadow-md)] sm:p-8 lg:p-10">
              <div
                className="
                  blog-content
                  text-[16px] leading-8 text-[var(--text-secondary)] sm:text-[17px]
                  [&>*:first-child]:mt-0
                  [&_h1]:mt-12 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:tracking-[-0.04em] [&_h1]:text-[var(--text-primary)]
                  [&_h2]:mt-12 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:leading-tight [&_h2]:tracking-[-0.04em] [&_h2]:text-[var(--text-primary)]
                  [&_h3]:mt-10 [&_h3]:text-2xl [&_h3]:font-black [&_h3]:text-[var(--text-primary)]
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

              <div className="mt-12 rounded-[1.7rem] border border-[var(--accent)]/18 bg-[var(--accent)]/10 p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  Growth Note
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  Strong websites do not only look good. They guide attention,
                  build trust, reduce friction, and make it easier for customers
                  to take action.
                </p>
              </div>
            </article>

            <aside className="hidden xl:block">
              <div className="sticky top-32 rounded-[1.7rem] border border-[var(--border)] bg-[var(--bg-card)]/90 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  Article Focus
                </p>
                <div className="mt-4 space-y-3">
                  {tags.length ? (
                    tags.map((tag) => (
                      <span
                        key={tag}
                        className="block rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-xs font-bold text-[var(--text-muted)]"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-[var(--text-muted)]">
                      Digital growth, UX, conversion, and ecommerce systems.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center sm:p-10 lg:p-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              Ready to improve your digital system?
            </p>
            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl">
              Let's turn your website into a stronger growth foundation.
            </h2>
            <Link
              href={post.cta_link || '/contact'}
              className="mt-8 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
            >
              {post.cta_text || 'Start A Project'}
              <SvgIcon name="arrow-diagonal" size={16} color="var(--btn-primary-text)" />
            </Link>
          </div>
        </section>

        <RelatedPosts posts={relatedPosts} />
      </main>

      <Footer />
    </>
  )
}