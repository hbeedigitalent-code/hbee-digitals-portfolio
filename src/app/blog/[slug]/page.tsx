'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function SingleBlogPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('status', 'published')
        .single()
      setPost(data)
      setLoading(false)
    }
    fetchPost()
  }, [params.slug])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = post?.title || 'Check out this article'

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#007BFF]" />
        </div>
        <Footer />
      </>
    )
  }

  if (!post) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Post Not Found</h1>
            <p className="text-gray-500">The blog post you're looking for doesn't exist.</p>
            <Link href="/blog" className="inline-block mt-4 text-[#007BFF] hover:underline">
              ← Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 bg-gray-50">
        <article className="container mx-auto px-4 max-w-4xl">
          {/* Back Button */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#007BFF] transition mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Blog
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
              <span>
                {new Date(post.published_at || post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span>•</span>
              <span>{post.views || 0} views</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg text-gray-600 leading-relaxed">{post.excerpt}</p>
            )}
          </div>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="relative h-80 md:h-96 mb-10 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Share Bar */}
          <div className="flex items-center gap-3 mb-8 p-4 bg-white rounded-xl shadow-sm border flex-wrap">
            <span className="text-sm text-gray-500 mr-2">Share:</span>
            
            {/* Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: '#1DA1F2' }}
              title="Share on Twitter"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: '#1877F2' }}
              title="Share on Facebook"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: '#0A66C2' }}
              title="Share on LinkedIn"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: '#25D366' }}
              title="Share on WhatsApp"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: '#26A5E4' }}
              title="Share on Telegram"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.426-.168.597-.5.797-.82.817-.697.064-1.226-.46-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.063-.174-.041-.25-.024-.107.024-1.804 1.146-5.094 3.367-.482.331-.918.492-1.31.484-.43-.01-1.26-.244-1.877-.444-.756-.246-1.356-.376-1.304-.793.027-.218.327-.44.898-.668 3.514-1.53 5.857-2.539 7.028-3.026 3.348-1.392 4.043-1.634 4.497-1.642.1-.002.323.023.468.14.122.099.156.232.172.326.016.094.036.306.02.472z" />
              </svg>
            </a>

            {/* Copy Link */}
            <button
              onClick={copyLink}
              className="ml-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-10 mb-10">
            <div
              className="prose prose-lg max-w-none blog-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          {/* CTA Section */}
          {post.cta_text && post.cta_link && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center p-10 rounded-2xl bg-gradient-to-r from-[#0A1D37] to-[#0F3460] mb-10"
            >
              <h3 className="text-2xl font-bold text-white mb-2">Ready to take the next step?</h3>
              <p className="text-white/70 mb-6">Let's work together to bring your ideas to life.</p>
              <a
                href={post.cta_link}
                className="inline-flex px-8 py-3.5 bg-white rounded-full font-semibold text-sm hover:shadow-xl transition"
                style={{ color: '#0A1D37' }}
              >
                {post.cta_text}
              </a>
            </motion.div>
          )}

          {/* Back to Blog */}
          <div className="text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[#007BFF] hover:underline font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Blog
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}