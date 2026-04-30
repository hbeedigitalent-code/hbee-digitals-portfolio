'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'
import Link from 'next/link'

export default function SingleBlogPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      <main className="pt-32 pb-20 bg-gray-50">
        <article className="container mx-auto px-4 max-w-4xl">
          {/* Back button */}
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#007BFF] transition mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Blog
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
              <span>{new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              {post.category && (
                <>
                  <span>•</span>
                  <span className="text-[#007BFF]">{post.category}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
          </div>

          {/* Featured Image */}
          {post.featured_image && (
            <div className="relative h-96 mb-10 rounded-2xl overflow-hidden shadow-lg">
              <Image
                src={post.featured_image}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Content with Rich Text */}
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-10">
            <div className="prose prose-lg max-w-none blog-content">
              {post.content ? (
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              ) : (
                <p className="text-gray-500">No content available.</p>
              )}
            </div>
          </div>

          {/* Share Section */}
          <div className="mt-8 pt-8 border-t text-center">
            <p className="text-sm text-gray-500 mb-3">Share this article</p>
            <div className="flex justify-center gap-3">
              <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-[#1DA1F2] hover:text-white transition flex items-center justify-center">
                🐦
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-[#0077B5] hover:text-white transition flex items-center justify-center">
                🔗
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-100 hover:bg-[#25D366] hover:text-white transition flex items-center justify-center">
                💬
              </button>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}