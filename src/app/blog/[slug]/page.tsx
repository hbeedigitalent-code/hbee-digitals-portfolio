'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/hooks/useSupabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default function SingleBlogPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select(`
          *,
          category:blog_categories(name, slug)
        `)
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
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">Loading post...</div>
        </div>
        <Footer />
      </>
    )
  }

  if (!post) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6 text-sm">
            <Link href="/blog" className="text-gray-500 hover:text-gray-700">
              Blog
            </Link>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-gray-700">{post.title}</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-gray-500 text-sm mb-6">
            <span>
              {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {post.featured_image && (
            <div className="relative h-96 mb-8 rounded-xl overflow-hidden shadow-lg">
              <Image
                src={post.featured_image}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm p-8 md:p-10">
            <div className="prose prose-lg max-w-none">
              {post.content?.split('\n').map((paragraph: string, i: number) => (
                <p key={i} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
            >
              Back to all posts
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}