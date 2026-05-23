import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

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

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        <section className="px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-5xl">
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

            <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
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
          <section className="px-5 pb-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-[#0E1B2D] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
              <img
                src={post.featured_image}
                alt={post.title}
                className="aspect-[16/9] w-full rounded-[1.7rem] object-cover"
              />
            </div>
          </section>
        )}

        <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <article className="prose prose-invert prose-lg mx-auto max-w-4xl prose-headings:font-black prose-headings:tracking-[-0.04em] prose-headings:text-white prose-p:leading-8 prose-p:text-white/68 prose-a:text-[#39D97A] prose-strong:text-white prose-li:text-white/68 prose-blockquote:border-[#39D97A] prose-blockquote:text-white/75">
            {post.content ? (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <p>
                This article is being prepared. Check back soon for the full
                insight.
              </p>
            )}
          </article>
        </section>

        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 text-center sm:p-10 lg:p-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Ready to improve your digital system?
            </p>

            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Let’s turn your website into a stronger growth foundation.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Hbee Digitals helps brands improve trust, UX, conversion flow,
              ecommerce systems, and premium digital presence.
            </p>

            <Link
              href={post.cta_link || '/contact'}
              className="mt-8 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              {post.cta_text || 'Start A Project'}
              <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}