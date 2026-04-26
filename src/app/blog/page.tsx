'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
      setPosts(data || [])
      setLoading(false)
    }
    fetchPosts()
  }, [])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">Loading blog posts...</div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-12">Our Blog</h1>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {post.featured_image && (
                    <div className="h-48 relative">
                      <Image src={post.featured_image} alt={post.title} fill className="object-cover" />
                    </div>
                  )}
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                    <p className="text-gray-600 mb-4">{post.excerpt || post.content?.substring(0, 150)}...</p>
                    <div className="text-sm text-gray-400">{new Date(post.published_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}