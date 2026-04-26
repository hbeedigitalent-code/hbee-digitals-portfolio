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
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">Loading post...</div>
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
          <div className="text-center">Post not found</div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <div className="text-gray-500 mb-8">{new Date(post.published_at).toLocaleDateString()}</div>
          {post.featured_image && (
            <div className="relative h-96 mb-8 rounded-lg overflow-hidden">
              <Image src={post.featured_image} alt={post.title} fill className="object-cover" />
            </div>
          )}
          <div className="prose max-w-none">
            {post.content?.split('\n').map((paragraph: string, i: number) => (
              <p key={i} className="mb-4">{paragraph}</p>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}