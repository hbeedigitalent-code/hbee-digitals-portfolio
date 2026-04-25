import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

async function getBlogPost(slug: string) {
  const { data } = await supabase
    .from('blog_posts')
    .select(`
      *,
      category:blog_categories(name, slug)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  
  // Increment view count
  if (data) {
    await supabase
      .from('blog_posts')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', data.id)
  }
  
  return data
}

async function getRelatedPosts(categoryId: string, currentId: string) {
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, slug, featured_image, published_at')
    .eq('category_id', categoryId)
    .eq('status', 'published')
    .neq('id', currentId)
    .limit(3)
  
  return data || []
}

export default async function SingleBlogPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)
  const relatedPosts = post?.category_id ? await getRelatedPosts(post.category_id, post.id) : []

  if (!post) {
    notFound()
  }

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm">
            <Link href="/blog" className="text-gray-500 hover:text-gray-700">
              Blog
            </Link>
            <span className="text-gray-400 mx-2">/</span>
            <span className="text-gray-700">{post.title}</span>
          </div>

          {/* Category */}
          {post.category && (
            <div className="mb-4">
              <Link 
                href={`/blog/category/${post.category.slug}`}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                {post.category.name}
              </Link>
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            {post.title}
          </h1>

          {/* Date and Views */}
          <div className="flex items-center gap-4 text-gray-500 text-sm mb-6">
            <span>
              {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {post.views || 0} views
            </span>
          </div>

          {/* Featured Image */}
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

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm p-8 md:p-10">
            <div className="prose prose-lg max-w-none">
              {post.content.split('\n').map((paragraph: string, i: number) => (
                <p key={i} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary-color)' }}>
                Related Posts
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
                      {relatedPost.featured_image && (
                        <div className="h-40 relative">
                          <Image
                            src={relatedPost.featured_image}
                            alt={relatedPost.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h4 className="font-semibold line-clamp-2">{relatedPost.title}</h4>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(relatedPost.published_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to Blog Button */}
          <div className="mt-8 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to all posts
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}