'use client'

import { useEffect, useState } from 'react'
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
  content: string
  featured_image?: string
  status: string
  created_at: string
  published_at?: string
  views?: number
  cta_text?: string
  cta_link?: string
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function estimateReadTime(content = '') {
  const words = stripHtml(content).split(' ').filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
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

export default function SingleBlogPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    async function fetchPost() {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('status', 'published')
        .single()

      setPost(data || null)
      setLoading(false)
    }

    fetchPost()
  }, [params.slug])

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = post?.title || 'Hbee Digitals article'
  const readTime = post ? estimateReadTime(post.content) : 0

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#07111F] text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
            <p className="text-sm font-bold text-white/45">Loading article...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!post) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#07111F] px-5 text-white">
          <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]/90 p-10 text-center backdrop-blur-xl">
            <SvgIcon name="blog" size={54} color="#39D97A" className="mx-auto mb-5" />
            <h1 className="text-3xl font-black">Article Not Found</h1>
            <p className="mt-3 text-white/55">The article you’re looking for doesn’t exist.</p>

            <Link
              href="/blog"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              <SvgIcon name="arrow-left" size={15} color="#06101F" />
              Back to Blog
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#123F2B]/38 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.022)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
        </div>

        <article className="relative z-10 px-5 pb-20 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href="/blog"
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D]/90 px-5 py-2.5 text-sm font-bold text-white/65 transition hover:border-[#39D97A]/35 hover:bg-[#13233A] hover:text-white"
              >
                <SvgIcon name="arrow-left" size={15} color="#39D97A" />
                Back to Blog
              </Link>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#0E1B2D]/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="blog" size={14} color="#39D97A" />
                Hbee Insight
              </div>

              <h1 className="max-w-5xl text-4xl font-black leading-[0.96] tracking-[-0.045em] sm:text-5xl md:text-6xl">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-6 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                  {post.excerpt}
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <MetaPill icon="calendar" label={new Date(post.published_at || post.created_at).toLocaleDateString()} />
                <MetaPill icon="clock" label={`${readTime} min read`} />
                <MetaPill icon="analytics" label={`${post.views || 0} views`} />
              </div>
            </motion.div>

            {post.featured_image && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="relative mt-12 overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0B1728] shadow-[0_30px_90px_rgba(0,0,0,0.25)]"
              >
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="max-h-[620px] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/60 via-transparent to-transparent" />
              </motion.div>
            )}

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-8 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-[#1E314A] bg-[#0E1B2D]/92 p-4 backdrop-blur-xl"
            >
              <span className="mr-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                <SvgIcon name="share" size={14} color="#39D97A" />
                Share Article
              </span>

              <ShareButton
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                label="Twitter"
                icon="twitter"
              />

              <ShareButton
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                label="LinkedIn"
                icon="linkedin"
              />

              <ShareButton
                href={`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`}
                label="WhatsApp"
                icon="whatsapp"
              />

              <button
                onClick={copyLink}
                className="ml-0 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#13233A] px-5 py-2 text-sm font-bold text-white transition hover:border-[#39D97A]/35 hover:bg-[#1A2F4B] sm:ml-auto"
              >
                <SvgIcon name={copied ? 'check' : 'link'} size={15} color="#39D97A" />
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </motion.div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_290px]"
            >
              <div
                className="
                  blog-content rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]/92 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl
                  sm:p-8 md:p-10
                  [&_*]:max-w-full
                  [&>div]:space-y-6
                  [&_h1]:mt-10 [&_h1]:text-4xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:tracking-[-0.04em]
                  [&_h2]:mt-10 [&_h2]:text-3xl [&_h2]:font-black [&_h2]:leading-tight [&_h2]:tracking-[-0.035em]
                  [&_h3]:mt-8 [&_h3]:text-2xl [&_h3]:font-black [&_h3]:leading-tight
                  [&_h4]:mt-7 [&_h4]:text-xl [&_h4]:font-black
                  [&_p]:text-[15px] [&_p]:leading-8 [&_p]:text-white/68 md:[&_p]:text-base
                  [&_strong]:font-black [&_strong]:text-white
                  [&_a]:font-bold [&_a]:text-[#39D97A] [&_a]:underline-offset-4 hover:[&_a]:text-[#C6F135] hover:[&_a]:underline
                  [&_ul]:space-y-3 [&_ul]:pl-0
                  [&_ol]:space-y-3 [&_ol]:pl-0
                  [&_li]:relative [&_li]:list-none [&_li]:pl-8 [&_li]:text-[15px] [&_li]:leading-8 [&_li]:text-white/66 md:[&_li]:text-base
                  [&_li:before]:absolute [&_li:before]:left-0 [&_li:before]:top-3 [&_li:before]:h-2 [&_li:before]:w-2 [&_li:before]:rounded-full [&_li:before]:bg-[#39D97A]
                  [&_blockquote]:my-8 [&_blockquote]:rounded-2xl [&_blockquote]:border-l-4 [&_blockquote]:border-[#39D97A] [&_blockquote]:bg-[#13233A] [&_blockquote]:p-5 [&_blockquote]:text-white/72
                  [&_img]:my-8 [&_img]:rounded-2xl [&_img]:border [&_img]:border-[#1E314A]
                  [&_hr]:my-10 [&_hr]:border-white/10
                  [&_table]:my-8 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-[#1E314A]
                  [&_th]:bg-[#13233A] [&_th]:p-4 [&_th]:text-left [&_th]:text-sm [&_th]:font-black [&_th]:text-white
                  [&_td]:border-t [&_td]:border-[#1E314A] [&_td]:p-4 [&_td]:text-sm [&_td]:text-white/65
                  [&_code]:rounded-md [&_code]:bg-[#07111F] [&_code]:px-2 [&_code]:py-1 [&_code]:text-[#C6F135]
                  [&_pre]:my-8 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-[#1E314A] [&_pre]:bg-[#07111F] [&_pre]:p-5
                "
              >
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </div>

              <aside className="hidden lg:block">
                <div className="sticky top-28 space-y-4">
                  <div className="rounded-[1.5rem] border border-[#1E314A] bg-[#0E1B2D]/92 p-5">
                    <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#39D97A]">
                      Article Tools
                    </p>

                    <button
                      onClick={copyLink}
                      className="mb-3 flex w-full items-center justify-between rounded-2xl border border-[#1E314A] bg-[#13233A] px-4 py-3 text-sm font-bold text-white/70 transition hover:border-[#39D97A]/30 hover:text-white"
                    >
                      Copy link
                      <SvgIcon name={copied ? 'check' : 'link'} size={15} color="#39D97A" />
                    </button>

                    <Link
                      href="/contact"
                      className="flex w-full items-center justify-between rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-3 text-sm font-bold text-[#39D97A] transition hover:bg-[#39D97A]/14"
                    >
                      Start project
                      <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
                    </Link>
                  </div>

                  <div className="rounded-[1.5rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-5">
                    <SvgIcon name="rocket" size={24} color="#39D97A" className="mb-4" />
                    <h3 className="text-xl font-black">Need help applying this?</h3>
                    <p className="mt-3 text-sm leading-7 text-white/58">
                      Let Hbee Digitals help you turn this insight into a working digital system.
                    </p>
                  </div>
                </div>
              </aside>
            </motion.div>

            {(post.cta_text || post.cta_link) && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 text-center sm:p-10"
              >
                <div className="mx-auto max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                    <SvgIcon name="rocket" size={14} color="#39D97A" />
                    Growth Opportunity
                  </div>

                  <h3 className="text-3xl font-black tracking-[-0.04em] text-white">
                    Ready to take the next step?
                  </h3>

                  <p className="mt-5 text-base leading-8 text-white/60">
                    Let’s help you improve your brand, website, ecommerce performance, and digital
                    growth system.
                  </p>

                  <a
                    href={post.cta_link || '/contact'}
                    className="mt-8 inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                  >
                    {post.cta_text || 'Start Your Project'}
                  </a>
                </div>
              </motion.div>
            )}

            <div className="mt-12 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-black text-[#39D97A] transition hover:text-[#C6F135]"
              >
                <SvgIcon name="arrow-left" size={15} color="#39D97A" />
                Back to All Articles
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </>
  )
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D]/90 px-4 py-2 text-xs font-bold text-white/55">
      <SvgIcon name={icon} size={14} color="#39D97A" />
      {label}
    </span>
  )
}

function ShareButton({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1E314A] bg-[#13233A] transition hover:-translate-y-1 hover:border-[#39D97A]/35 hover:bg-[#1A2F4B]"
      aria-label={label}
    >
      <SvgIcon name={icon} size={17} color="#39D97A" />
    </a>
  )
}