'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import GridPattern from '@/components/ui/GridPattern'
import GlowOrb from '@/components/ui/GlowOrb'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  featured_image: string
  category_id: string
  status: string
  created_at: string
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  // Initial load: all published posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (data) setPosts(data)
      setLoading(false)
    }
    fetchPosts()
  }, [])

  // Debounced search across title AND content
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // Reset to full list (already fetched)
      const reset = async () => {
        setSearching(true)
        const { data } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
        if (data) setPosts(data)
        setSearching(false)
      }
      reset()
      return
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true)
      const term = `%${searchQuery}%`
      const { data } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .or(`title.ilike.${term}, content.ilike.${term}`)
        .order('created_at', { ascending: false })
      if (data) setPosts(data)
      setSearching(false)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  return (
    <>
      <Navbar />
      <main className="relative pt-28 pb-20 min-h-screen overflow-hidden bg-gradient-to-br from-[#020617] via-[#0A1D37] to-[#0F3460]">
        {/* Background: Animated Grid */}
        <GridPattern />
        {/* Ambient light */}
        <GlowOrb />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-['Poppins']">
              Our Blog
            </h1>
            <p className="text-white/70 max-w-2xl mx-auto">
              Insights, tutorials, and news from our team.
            </p>
          </motion.div>

          {/* Search bar */}
          <div className="max-w-md mx-auto mb-10 relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-12 pr-12 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:border-transparent transition-all"
                aria-label="Search blog posts"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-white/40 text-xs mt-2 text-center">
                {searching ? 'Searching...' : `Found ${posts.length} result${posts.length !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-4 animate-pulse">
                  <div className="h-40 bg-white/10 rounded-xl mb-4" />
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-white/10 rounded w-full mb-1" />
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {/* Blog posts grid */}
          {!loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-white/50 text-lg">No posts found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
                </div>
              ) : (
                posts.map((post, index) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={{ y: -6 }}
                    className="group"
                  >
                    <Link href={`/blog/${post.slug}`}>
                      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 h-full flex flex-col">
                        {/* Featured image */}
                        <div className="relative h-48 overflow-hidden">
                          {post.featured_image ? (
                            <img
                              src={post.featured_image}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#007BFF]/20 to-[#00BFFF]/20 flex items-center justify-center">
                              <svg className="w-12 h-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5 flex flex-col flex-1">
                          <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#00BFFF] transition-colors line-clamp-2">
                            {post.title}
                          </h2>
                          {post.excerpt && (
                            <p className="text-white/60 text-sm mb-4 flex-1 line-clamp-3">
                              {post.excerpt}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                            <span className="text-white/40 text-xs">
                              {new Date(post.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            <span className="text-[#00BFFF] text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                              Read more
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}