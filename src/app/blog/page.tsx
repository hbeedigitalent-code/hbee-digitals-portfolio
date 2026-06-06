'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SvgIcon from '@/components/ui/SvgIcon';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  published_at: string;
  read_time: string;
  tags: string[];
  post_type: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postType, setPostType] = useState('all');

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    setPosts(data || []);
    setLoading(false);
  }

  const filteredPosts = posts.filter(post => 
    postType === 'all' || post.post_type === postType
  );

  const featuredPost = filteredPosts.find(p => p.tags?.includes('featured')) || filteredPosts[0];
  const otherPosts = featuredPost ? filteredPosts.filter(p => p.id !== featuredPost.id) : filteredPosts;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-[var(--bg-page)]">
        {/* Hero Section */}
        <section className="px-5 pt-32 pb-16 sm:px-6 md:px-10 lg:px-12 bg-gradient-to-b from-[var(--accent)]/5 to-transparent">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--accent)]/10 rounded-full px-4 py-2 mb-6">
              <SvgIcon name="blog" size={16} color="var(--accent)" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Insights</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--text-primary)] mb-6">
              Engineering Growth Through<br />
              <span className="text-[var(--accent)]">Practical Insights</span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Articles on Shopify optimization, ecommerce UX, conversion strategy,
              branding, and digital growth systems for ambitious brands.
            </p>
          </div>
        </section>

        {/* Filter Tabs */}
        <div className="px-5 py-8 sm:px-6 md:px-10 lg:px-12 border-b border-[var(--border)]">
          <div className="flex flex-wrap justify-center gap-3">
            {['all', 'blog', 'case_study'].map((type) => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition ${
                  postType === type
                    ? 'bg-gradient-orange-green text-white'
                    : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                }`}
              >
                {type === 'all' ? 'All Content' : type === 'blog' ? '📝 Blog Posts' : '📊 Case Studies'}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Post - Image on Top, Text Below */}
        {featuredPost && (
          <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <Link href={`/blog/${featuredPost.slug}`} className="group block max-w-5xl mx-auto">
              <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-xl transition">
                {/* Image at top */}
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={featuredPost.featured_image || '/placeholder-blog.jpg'}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
                {/* Content below image */}
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {featuredPost.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-[var(--accent)] transition">
                    {featuredPost.title}
                  </h2>
                  <p className="text-[var(--text-secondary)] mb-4 line-clamp-2">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                    <span>{new Date(featuredPost.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {featuredPost.read_time && <span>• {featuredPost.read_time}</span>}
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Blog Grid - Image on Top for all cards */}
        <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {otherPosts.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <div className="rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-lg transition h-full flex flex-col">
                    {/* Image at top */}
                    <div className="aspect-[16/9] overflow-hidden">
                      <img
                        src={post.featured_image || '/placeholder-blog.jpg'}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                    {/* Content below */}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-[var(--text-secondary)] text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between mt-auto pt-3 text-sm text-[var(--text-muted)]">
                        <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        {post.read_time && <span>{post.read_time}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section Between Blog Listings */}
        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12 bg-gradient-to-r from-[var(--accent)]/5 to-[var(--accent-orange)]/5">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--accent)]/10 rounded-full px-4 py-2 mb-6">
              <SvgIcon name="growth" size={16} color="var(--accent)" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Ready to Scale?</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4">
              Turn Insights Into Action
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
              Let's build a digital system that improves trust, conversion, and long-term growth for your brand.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-gradient-orange-green text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition"
            >
              Request a Growth Review
              <SvgIcon name="arrow-right" size={16} color="white" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}