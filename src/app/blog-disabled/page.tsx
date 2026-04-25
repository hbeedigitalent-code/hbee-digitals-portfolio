import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'

async function getBlogPosts() {
  const { data } = await supabase
    .from('blog_posts')
    .select(`
      *,
      category:blog_categories(name, slug)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  
  return data || []
}

export default async function BlogPage() {
  const posts = await getBlogPosts()

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
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <article key={post.id} className="group">
                  <Link href={`/blog/${post.slug}`}>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300">
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
                        {post.category && (
                          <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                            {post.category.name}
                          </span>
                        )}
                        <h2 className="text-xl font-bold mt-2 mb-2 group-hover:text-blue-600 transition line-clamp-2">
                          {post.title}
                        </h2>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {post.excerpt || post.content.substring(0, 150)}...
                        </p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400">
                            {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                            Read More
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}