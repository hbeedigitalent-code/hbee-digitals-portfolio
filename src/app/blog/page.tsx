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
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
      >
        <path d="M4 13C50 2 142 2 216 11" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
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
        <main className="flex min-h-screen items-center justify-center bg-[#060E1C] text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen overflow-hidden bg-[#060E1C] text-white">
        <div className="absolute inset-0 -z-0">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#39D97A]/7 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.035)_1px,transparent_1px)] bg-[size:76px_76px] opacity-25" />
        </div>

        <section className="relative z-10 px-5 pb-12 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-4xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="blog" size={14} color="#39D97A" />
                Hbee Insights
              </div>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
                Ideas for smarter digital{' '}
                <CurvedUnderlineText>growth.</CurvedUnderlineText>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 md:text-lg">
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
                  className="w-full rounded-full border border-white/10 bg-white/[0.045] py-4 pl-14 pr-14 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/45 focus:bg-[#39D97A]/8"
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
          <section className="relative z-10 px-5 pb-14 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group grid overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/88 shadow-[0_35px_110px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr]"
              >
                <div className="relative h-[280px] overflow-hidden sm:h-[380px] lg:h-auto">
                  {featuredPost.featured_image ? (
                    <img
                      src={featuredPost.featured_image}
                      alt={featuredPost.title}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[#0B1E38]">
                      <SvgIcon name="blog" size={72} color="#39D97A" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C] via-transparent to-transparent" />
                </div>

                <div className="relative p-6 sm:p-8 lg:p-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.18),transparent_42%)]" />

                  <div className="relative">
                    <div className="mb-5 inline-flex rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A]">
                      Featured Article
                    </div>

                    <h2 className="text-3xl font-black leading-tight tracking-[-0.045em] text-white sm:text-4xl">
                      {featuredPost.title}
                    </h2>

                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-white/62 sm:text-base">
                      {featuredPost.excerpt || 'Read the latest insight from Hbee Digitals.'}
                    </p>

                    <div className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                      Read Article
                      <SvgIcon name="arrow-diagonal" size={16} color="#39D97A" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        <section className="relative z-10 px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            {filteredPosts.length === 0 ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
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
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="group overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#08182D] shadow-[0_28px_80px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-[#39D97A]/30"
                  >
                    <Link href={`/blog/${post.slug}`}>
                      <div className="relative h-56 overflow-hidden bg-[#0B1E38]">
                        {post.featured_image ? (
                          <img
                            src={post.featured_image}
                            alt={post.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <SvgIcon name="blog" size={54} color="#39D97A" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C] via-transparent to-transparent" />
                      </div>

                      <div className="p-5">
                        <p className="mb-3 text-xs font-semibold text-[#39D97A]">
                          {new Date(post.published_at || post.created_at).toLocaleDateString()}
                        </p>

                        <h3 className="text-xl font-black leading-tight tracking-[-0.035em] text-white">
                          {post.title}
                        </h3>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/55">
                          {post.excerpt || 'Read this article from Hbee Digitals.'}
                        </p>

                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                          Read More
                          <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
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