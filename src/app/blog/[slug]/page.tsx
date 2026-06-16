import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { cleanBlogHtml, generateToc, absoluteUrl } from '@/lib/blog-utils'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'
import BlogTableOfContents from '@/components/blog/BlogTableOfContents'
import BlogAuthorBio from '@/components/blog/BlogAuthorBio'
import BlogReadingTools from '@/components/blog/BlogReadingTools'
import BlogNewsletterSignup from '@/components/blog/BlogNewsletterSignup'
import RelatedPosts from '@/components/blog/RelatedPosts'
import BlogComments from '@/components/blog/BlogComments'
import '@/styles/blog-content.css'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string | null
  featured_image_alt: string | null
  tags: string[] | null
  author: string | null
  status: string
  is_featured: boolean
  featured_badge: string | null
  read_time: string | null
  published_at: string | null
  updated_at: string | null
  seo_title: string | null
  seo_description: string | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  canonical_url: string | null
  focus_keyword: string | null
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)

  if (!post) {
    return {
      title: 'Article Not Found | Hbee Digitals',
    }
  }

  const title = post.seo_title || post.og_title || post.title
  const description =
    post.seo_description || post.og_description || post.excerpt?.slice(0, 160) || ''
  const ogImage = absoluteUrl(post.og_image || post.featured_image)
  const canonical = post.canonical_url || `https://www.hbeedigitals.com/blog/${post.slug}`

  return {
    title: `${title} | Hbee Digitals`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: post.og_title || title,
      description: post.og_description || description,
      url: canonical,
      siteName: 'Hbee Digitals',
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.featured_image_alt || post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.og_title || title,
      description: post.og_description || description,
      images: [ogImage],
    },
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  const cleanedContent = cleanBlogHtml(post.content)
  generateToc(cleanedContent)

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const formattedUpdateDate = post.updated_at
    ? new Date(post.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] pt-28">
        <article className="mx-auto max-w-[980px] px-4 sm:px-6 lg:px-8">
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="max-w-[860px] text-3xl font-black tracking-[-0.02em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="mt-5 max-w-[760px] text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              {post.excerpt}
            </p>
          )}

          {/* Author & Reading Tools */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <BlogAuthorBio
              author={post.author || 'Hbee Digitals'}
              date={formattedUpdateDate || formattedDate || undefined}
              readTime={post.read_time || undefined}
            />

            <BlogReadingTools title={post.title} />
          </div>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-section)]">
              <img
                src={post.featured_image}
                alt={post.featured_image_alt || post.title}
                className="aspect-[1200/630] h-full w-full object-cover"
                loading="eager"
              />
            </div>
          )}

          {/* Content */}
          <div className="mt-10">
            <BlogTableOfContents content={cleanedContent} />

            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: cleanedContent }}
            />

            <BlogNewsletterSignup />
            <BlogComments postSlug={post.slug} />
            <RelatedPosts currentSlug={post.slug} tags={post.tags} />
          </div>
        </article>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-[980px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy)] p-8 text-center sm:p-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2">
              <SvgIcon name="growth" size={14} color="var(--accent)" />
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Need help improving your store?
              </span>
            </div>

            <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
              Hbee Digitals helps businesses improve trust, user experience,
              conversion flow, and growth systems that turn visitors into customers.
            </h2>

            <div className="mt-8">
              <Button href="/contact" variant="cta" size="lg">
                Request a Growth Review
                <SvgIcon name="arrow-right" size={16} color="white" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}