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
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .eq('post_type', 'blog')
      .order('published_at', { ascending: false });

    setPosts(data || []);
    setLoading(false);
  }

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]" />
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
              <img src="/svgs/blog.svg" alt="Blog" className="w-4 h-4" />
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

        {/* Featured Post - Image on Top */}
        {featuredPost && (
          <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <Link href={`/blog/${featuredPost.slug}`} className="group block max-w-5xl mx-auto">
              <div className="rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-xl transition">
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={featuredPost.featured_image || '/placeholder-blog.jpg'}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
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
                    <span className="flex items-center gap-1">
                      <img src="/svgs/calendar.svg" alt="Date" className="w-3 h-3" />
                      {new Date(featuredPost.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {featuredPost.read_time && (
                      <span className="flex items-center gap-1">
                        <img src="/svgs/clock.svg" alt="Read time" className="w-3 h-3" />
                        {featuredPost.read_time}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Blog Grid */}
        <section className="px-5 py-12 sm:px-6 md:px-10 lg:px-12">
          <div className="max-w-7xl mx-auto">
            {otherPosts.length === 0 && !featuredPost ? (
              <div className="text-center py-16">
                <img src="/svgs/blog.svg" alt="No posts" className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-[var(--text-muted)]">No blog posts yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherPosts.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                    <div className="rounded-xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] hover:shadow-lg transition h-full flex flex-col">
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={post.featured_image || '/placeholder-blog.jpg'}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                      </div>
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
                        <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mt-auto pt-3">
                          <span className="flex items-center gap-1">
                            <img src="/svgs/calendar.svg" alt="Date" className="w-3 h-3" />
                            {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {post.read_time && (
                            <span className="flex items-center gap-1">
                              <img src="/svgs/clock.svg" alt="Read time" className="w-3 h-3" />
                              {post.read_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12 bg-gradient-to-r from-[var(--accent)]/5 to-[var(--accent-orange)]/5">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-[var(--accent)]/10 rounded-full px-4 py-2 mb-6">
              <img src="/svgs/growth.svg" alt="Growth" className="w-4 h-4" />
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
              <img src="/svgs/arrow-right.svg" alt="Arrow" className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}