'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/hooks/useSupabase'
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
      <main className="pt-32 pb-20 bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
              Our Blog
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Insights, stories, and updates from our team
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
                    {post.featured_image && (
                      <div className="h-48 relative overflow-hidden">
                        <Image
                          src={post.featured_image}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-500"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition">
                        {post.title}
                      </h2>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {post.excerpt || post.content?.substring(0, 150)}...
                      </p>
                      <div className="text-sm text-gray-400">
                        {new Date(post.published_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}