'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  content?: string
  featured_image?: string
  category_id?: string
  status: string
  created_at: string
  published_at?: string
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>
      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      setPosts(data || [])
      setLoading(false)
    }

    fetchPosts()
  }, [])

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return posts

    return posts.filter((post) =>
      `${post.title} ${post.excerpt || ''} ${post.content || ''}`
        .toLowerCase()
        .includes(query)
    )
  }, [posts, searchQuery])

  const featuredPost = posts[0]
  const remainingPosts = filteredPosts.filter((post) => post.id !== featuredPost?.id)

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#07111F] text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#123F2B]/38 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.022)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
        </div>

        <section className="relative px-5 pb-12 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-5xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#0E1B2D]/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="blog" size={14} color="#39D97A" />
                Hbee Insights
              </div>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Ideas for smarter digital{' '}
                <CurvedUnderlineText>growth.</CurvedUnderlineText>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                Practical insights on websites, Shopify, conversion, branding, digital strategy,
                and building better online systems.
              </p>
            </motion.div>

            <div className="mt-10 max-w-xl">
              <div className="relative">
                <SvgIcon
                  name="search"
                  size={18}
                  color="rgba(255,255,255,0.45)"
                  className="absolute left-5 top-1/2 -translate-y-1/2"
                />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full rounded-full border border-[#1E314A] bg-[#0E1B2D]/90 py-4 pl-14 pr-14 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/45 focus:bg-[#13233A]"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-5 top-1/2 -translate-y-1/2"
                    aria-label="Clear search"
                  >
                    <SvgIcon name="close" size={16} color="rgba(255,255,255,0.55)" />
                  </button>
                )}
              </div>

              {searchQuery && (
                <p className="mt-3 text-center text-xs font-semibold text-white/40">
                  Showing {filteredPosts.length} result{filteredPosts.length === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>
        </section>

        {featuredPost && !searchQuery && (
          <section className="relative px-5 pb-14 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group grid overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] shadow-[0_32px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr]"
              >
                <div className="relative h-[280px] overflow-hidden bg-[#0B1728] sm:h-[390px] lg:h-auto">
                  {featuredPost.featured_image ? (
                    <img
                      src={featuredPost.featured_image}
                      alt={featuredPost.title}
                      loading="eager"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#0B1728]">
                      <SvgIcon name="blog" size={72} color="#39D97A" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/80 via-[#07111F]/15 to-transparent" />

                  <div className="absolute left-5 top-5 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A] backdrop-blur-xl">
                    Featured Article
                  </div>
                </div>

                <div className="relative p-6 sm:p-8 lg:p-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.11),transparent_40%)]" />

                  <div className="relative">
                    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                      Digital Growth Notes
                    </p>

                    <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
                      {featuredPost.title}
                    </h2>

                    <p className="mt-5 line-clamp-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                      {featuredPost.excerpt || 'Read the latest insight from Hbee Digitals.'}
                    </p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                      {['Insight', 'Strategy', 'Growth'].map((label) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-[#1E314A] bg-[#0B1728]/90 px-4 py-3"
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
                            {label}
                          </p>
                          <p className="mt-2 text-sm font-black text-white">Guide</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition group-hover:scale-[1.02] group-hover:bg-[#C6F135]">
                      Read Article
                      <SvgIcon
                        name="arrow-diagonal"
                        size={16}
                        color="#06101F"
                        className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        <section className="relative px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-white/48">
                Showing{' '}
                <span className="font-black text-[#39D97A]">
                  {searchQuery ? filteredPosts.length : remainingPosts.length}
                </span>{' '}
                article{(searchQuery ? filteredPosts.length : remainingPosts.length) === 1 ? '' : 's'}
              </p>

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/32">
                Practical digital growth insights
              </p>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]/90 px-6 py-16 text-center backdrop-blur-xl">
                <SvgIcon name="blog" size={46} color="#39D97A" className="mx-auto mb-4" />
                <h3 className="text-lg font-black text-white">No articles found</h3>
                <p className="mt-2 text-sm text-white/45">Try another search keyword.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {(searchQuery ? filteredPosts : remainingPosts).map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.42, delay: index * 0.045 }}
                    viewport={{ once: true }}
                    className="group overflow-hidden rounded-[1.8rem] border border-[#1E314A] bg-[#0E1B2D]/90 shadow-[0_28px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-[#39D97A]/30 hover:bg-[#13233A]"
                  >
                    <Link href={`/blog/${post.slug}`} className="block">
                      <div className="relative h-56 overflow-hidden bg-[#0B1728]">
                        {post.featured_image ? (
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <SvgIcon name="blog" size={54} color="#39D97A" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/20 to-transparent" />
                      </div>

                      <div className="p-6">
                        <p className="mb-3 text-xs font-semibold text-[#39D97A]">
                          {new Date(post.published_at || post.created_at).toLocaleDateString()}
                        </p>

                        <h3 className="text-2xl font-black leading-tight tracking-[-0.035em] text-white">
                          {post.title}
                        </h3>

                        <p className="mt-4 line-clamp-3 text-sm leading-7 text-white/58">
                          {post.excerpt || 'Read this article from Hbee Digitals.'}
                        </p>

                        <div className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#39D97A] transition group-hover:text-[#C6F135]">
                          Read More
                          <SvgIcon
                            name="arrow-diagonal"
                            size={15}
                            color="#39D97A"
                            className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          />
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}