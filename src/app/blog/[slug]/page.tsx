import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cleanBlogHtml, generateToc, absoluteUrl } from '@/lib/blog-utils'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BlogTableOfContents from '@/components/blog/BlogTableOfContents'
import BlogAuthorBio from '@/components/blog/BlogAuthorBio'
import BlogReadingTools from '@/components/blog/BlogReadingTools'
import BlogNewsletterSignup from '@/components/blog/BlogNewsletterSignup'
import RelatedPosts from '@/components/blog/RelatedPosts'
import BlogComments from '@/components/blog/BlogComments'

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

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}) {
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

// Fetch single blog post by slug
async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      console.error('Error fetching blog post:', error)
      return null
    }

    return data
  } catch {
    return null
  }
}

// Get all unique tags for filters
async function getAllTags(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('blog_posts')
      .select('tags')
      .eq('status', 'published')

    const tagSet = new Set<string>()
    data?.forEach((post) => {
      post.tags?.forEach((tag: string) => {
        if (tag?.trim()) tagSet.add(tag.trim())
      })
    })

    return ['All', ...Array.from(tagSet).sort()]
  } catch {
    return ['All']
  }
}

interface BlogPostPageProps {
  params: { slug: string }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  const cleanedContent = cleanBlogHtml(post.content)
  const tocItems = generateToc(cleanedContent)
  const tags = await getAllTags()

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

      <main className="min-h-screen bg-[var(--bg-page)]">
        {/* Article Header */}
        <article className="mx-auto max-w-5xl px-4 pt-28 sm:px-6 lg:px-8">
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#39D97A]/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#39D97A]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="max-w-4xl text-3xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
              {post.excerpt}
            </p>
          )}

          {/* Author row + share tools */}
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
            <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.featured_image}
                alt={post.featured_image_alt || post.title}
                className="h-auto w-full object-cover"
                loading="eager"
              />
            </div>
          )}

          {/* Content Layout: TOC sidebar + Article */}
          <div className="mt-10 flex gap-10 lg:mt-14">
            {/* Desktop TOC Sidebar */}
            <aside className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-28">
                <BlogTableOfContents content={cleanedContent} />
              </div>
            </aside>

            {/* Main Article Content */}
            <div className="min-w-0 flex-1">
              {/* Mobile TOC */}
              <div className="mb-8 lg:hidden">
                <BlogTableOfContents content={cleanedContent} />
              </div>

              {/* Article Body - cleaned HTML rendered with dangerouslySetInnerHTML */}
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: cleanedContent }}
              />

              {/* Newsletter Signup */}
              <BlogNewsletterSignup />

              {/* Comments Section */}
              <BlogComments postSlug={post.slug} />

              {/* Related Posts */}
              <RelatedPosts currentSlug={post.slug} tags={post.tags} />
            </div>
          </div>
        </article>

        {/* CTA Section */}
        <section className="mx-auto mt-20 max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] border border-[var(--border)] bg-[#0E1B2D] p-8 text-center sm:p-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <img src="/svgs/growth.svg" alt="" className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                Need help improving your store?
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">
              Hbee Digitals helps businesses improve trust, user experience, conversion
              flow, and growth systems that turn visitors into customers.
            </h2>

            <a
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#39D97A] px-8 py-4 text-sm font-black text-[#07111F] transition hover:scale-[1.02]"
            >
              Request a Growth Review
              <img src="/svgs/arrow-right.svg" alt="" className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}