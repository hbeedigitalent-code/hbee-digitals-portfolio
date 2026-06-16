'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  featured_image?: string | null
  featured_image_alt?: string | null
  tags?: string[] | null
  author?: string | null
  status?: string | null
  is_featured?: boolean | null
  featured_badge?: string | null
  read_time?: string | null
  published_at?: string | null
  created_at?: string | null
}

function formatDate(date?: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BlogPage() {
  const reducedMotion = useReducedMotion()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState('All')

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Blog fetch error:', error)
      setPosts([])
    } else {
      setPosts(data || [])
    }

    setLoading(false)
  }

  const tags = useMemo(() => {
    const allTags = posts.flatMap((post) => post.tags || [])
    return ['All', ...Array.from(new Set(allTags)).slice(0, 10)]
  }, [posts])

  const filteredPosts = useMemo(() => {
    if (activeTag === 'All') return posts
    return posts.filter((post) => post.tags?.includes(activeTag))
  }, [posts, activeTag])

  const featuredPost = useMemo(() => {
    return filteredPosts.find((post) => post.is_featured) || filteredPosts[0]
  }, [filteredPosts])

  const latestPosts = useMemo(() => {
    return filteredPosts.filter((post) => post.id !== featuredPost?.id)
  }, [filteredPosts, featuredPost])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] pt-28">
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pb-12 sm:px-6 md:px-10 lg:px-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--accent)]/5 to-transparent" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1">
              <SvgIcon name="blog" size={14} color="var(--accent)" />
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Hbee Insights
              </span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-[-0.02em] text-[var(--text-primary)] sm:text-5xl lg:text-6xl">
              Practical ecommerce <span className="text-[var(--accent)]">growth insights</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
              Strategy articles on ecommerce, Shopify, conversion optimization,
              customer trust, brand positioning, and digital systems built for growth.
            </p>

            {tags.length > 1 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      activeTag === tag
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <section className="flex min-h-[360px] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </section>
        ) : filteredPosts.length === 0 ? (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] px-6 py-20 text-center">
              <SvgIcon name="blog" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">No published articles yet.</h2>
              <p className="mt-3 text-[var(--text-muted)]">
                Publish a new blog post from the admin dashboard and it will appear here.
              </p>
            </div>
          </section>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="px-5 py-8 sm:px-6 md:px-10 lg:px-12"
              >
                <div className="mx-auto max-w-[1080px]">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Featured Article</h2>
                    <Link
                      href={`/blog/${featuredPost.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:gap-3 transition-all"
                    >
                      Read Article
                      <SvgIcon name="arrow-right" size={14} color="var(--accent)" />
                    </Link>
                  </div>

                  <BlogCard post={featuredPost} featured />
                </div>
              </motion.section>
            )}

            {/* Latest Articles */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="px-5 py-12 sm:px-6 md:px-10 lg:px-12"
            >
              <div className="mx-auto max-w-[1080px]">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl">
                    Latest Articles
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Fresh insights to help you improve trust, conversion, and digital growth.
                  </p>
                </div>

                {latestPosts.length > 0 ? (
                  <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {latestPosts.map((post, index) => (
                      <motion.div key={post.id} variants={itemVariants}>
                        <BlogCard post={post} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
                    <SvgIcon name="blog" size={32} color="var(--text-muted)" className="mx-auto mb-4" />
                    <p className="text-[var(--text-muted)]">
                      No other articles yet. Publish another post to fill this section.
                    </p>
                  </div>
                )}
              </div>
            </motion.section>
          </>
        )}

        {/* CTA */}
        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-[1080px] rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy)] p-8 text-center sm:p-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2">
              <SvgIcon name="growth" size={14} color="var(--accent)" />
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Ready to Scale?
              </span>
            </div>

            <h2 className="mx-auto max-w-2xl text-2xl sm:text-3xl font-bold text-white">
              Turn ecommerce insights into measurable growth
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--text-on-dark-muted)] sm:text-base">
              Let's review your website, customer journey, trust signals, and growth
              opportunities so your brand can convert better.
            </p>

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

function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <article
        className={`flex h-full flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lg)] ${
          featured ? 'rounded-2xl' : 'rounded-xl'
        }`}
      >
        <div className="aspect-[1200/630] overflow-hidden bg-[var(--bg-section)]">
          {post.featured_image ? (
            <img
              src={post.featured_image}
              alt={post.featured_image_alt || post.title}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <SvgIcon name="blog" size={40} color="var(--text-muted)" />
            </div>
          )}
        </div>

        <div className={featured ? 'p-6 sm:p-8' : 'flex flex-1 flex-col p-5'}>
          <div className="mb-4 flex flex-wrap gap-2">
            {post.is_featured && (
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                {post.featured_badge || 'Featured'}
              </span>
            )}

            {post.tags?.slice(0, featured ? 4 : 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h3
            className={`font-bold leading-tight tracking-[-0.02em] text-[var(--text-primary)] transition group-hover:text-[var(--accent)] ${
              featured ? 'text-2xl sm:text-3xl' : 'text-xl'
            }`}
          >
            {post.title}
          </h3>

          {post.excerpt && (
            <p
              className={`mt-4 text-[var(--text-secondary)] ${
                featured ? 'max-w-3xl text-base leading-8' : 'line-clamp-3 text-sm leading-7'
              }`}
            >
              {post.excerpt}
            </p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-xs text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-primary)]">
              {post.author || 'Hbee Digitals'}
            </span>

            <span className="flex items-center gap-1.5">
              <SvgIcon name="calendar" size={12} color="var(--text-muted)" />
              {formatDate(post.published_at || post.created_at)}
            </span>

            {post.read_time && (
              <span className="flex items-center gap-1.5">
                <SvgIcon name="clock" size={12} color="var(--text-muted)" />
                {post.read_time}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}