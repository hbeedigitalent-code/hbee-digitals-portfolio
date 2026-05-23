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

      <main className="relative overflow-hidden bg-[#07111F] pb-16 text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        <section className="px-5 pb-10 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pt-36">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/blog"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-4 py-2 text-sm font-bold text-white/60 transition hover:border-[#39D97A]/25 hover:text-white"
            >
              <SvgIcon name="chevron-left" size={14} color="#39D97A" />
              Back to Blog
            </Link>

            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="blog" size={14} color="#39D97A" />
              Growth Insight
            </p>

            <h1 className="max-w-6xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl md:text-6xl lg:text-7xl">
              <GradientHeading>{post.title}</GradientHeading>
            </h1>

            {post.excerpt && (
              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                {post.excerpt}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-[#1E314A] bg-[#0E1B2D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
                {formatDate(post.published_at || post.created_at)}
              </span>

              <span className="rounded-full border border-[#1E314A] bg-[#0E1B2D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
                {post.author || 'Hbee Digitals'}
              </span>

              {post.read_time && (
                <span className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  {post.read_time}
                </span>
              )}
            </div>

            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {post.featured_image && (
          <section className="px-5 pb-14 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
              <img
                src={post.featured_image}
                alt={post.title}
                className="aspect-[16/9] w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </section>
        )}

        <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[72px_minmax(0,820px)_1fr]">
            <BlogReadingTools title={post.title} />

            <article className="min-w-0 overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]/78 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.24)] sm:p-8 lg:p-10">
              <div
                className="
                  blog-content
                  text-[16px] leading-8 text-white/72 sm:text-[17px]
                  [&>*:first-child]:mt-0
                  [&_h1]:mt-12 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:tracking-[-0.04em] [&_h1]:text-white
                  [&_h2]:mt-12 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:leading-tight [&_h2]:tracking-[-0.04em] [&_h2]:text-white
                  [&_h3]:mt-10 [&_h3]:text-2xl [&_h3]:font-black [&_h3]:text-white
                  [&_p]:mt-5 [&_p]:leading-8 [&_p]:text-white/70
                  [&_strong]:font-black [&_strong]:text-white
                  [&_a]:font-bold [&_a]:text-[#39D97A] [&_a]:underline
                  [&_ul]:mt-5 [&_ul]:space-y-3 [&_ul]:pl-5
                  [&_ol]:mt-5 [&_ol]:space-y-3 [&_ol]:pl-5
                  [&_li]:pl-2 [&_li]:leading-8 [&_li]:text-white/70
                  [&_blockquote]:mt-8 [&_blockquote]:rounded-[1.5rem] [&_blockquote]:border-l-4 [&_blockquote]:border-[#39D97A] [&_blockquote]:bg-[#07111F] [&_blockquote]:p-6 [&_blockquote]:text-white/75
                  [&_img]:mt-8 [&_img]:rounded-[1.5rem] [&_img]:border [&_img]:border-[#1E314A]
                "
                dangerouslySetInnerHTML={{
                  __html:
                    post.content ||
                    '<p>This article is being prepared. Check back soon for the full insight.</p>',
                }}
              />

              <div className="mt-12 rounded-[1.7rem] border border-[#39D97A]/18 bg-[#39D97A]/10 p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Growth Note
                </p>

                <p className="mt-3 text-sm leading-7 text-white/68">
                  Strong websites do not only look good. They guide attention,
                  build trust, reduce friction, and make it easier for customers
                  to take action.
                </p>
              </div>
            </article>

            <aside className="hidden xl:block">
              <div className="sticky top-32 rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D]/90 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Article Focus
                </p>

                <div className="mt-4 space-y-3">
                  {tags.length ? (
                    tags.map((tag) => (
                      <span
                        key={tag}
                        className="block rounded-full border border-[#1E314A] bg-[#07111F] px-4 py-2 text-xs font-bold text-white/60"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-white/50">
                      Digital growth, UX, conversion, and ecommerce systems.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 text-center sm:p-10 lg:p-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Ready to improve your digital system?
            </p>

            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Let’s turn your website into a stronger growth foundation.
            </h2>

            <Link
              href={post.cta_link || '/contact'}
              className="mt-8 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              {post.cta_text || 'Start A Project'}
              <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
            </Link>
          </div>
        </section>

        <RelatedPosts posts={relatedPosts} />
      </main>

      <Footer />
    </>
  )
}