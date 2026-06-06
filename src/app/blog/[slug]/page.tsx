'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SvgIcon from '@/components/ui/SvgIcon';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  published_at: string;
  read_time: string;
  author: string;
  tags: string[];
}

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (params?.slug) {
      fetchPost();
      fetchComments();
    }
  }, [params?.slug]);

  async function fetchPost() {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single();

    if (data) {
      setPost(data);
      // Fetch related posts (same tags)
      const { data: related } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .neq('id', data.id)
        .limit(3);
      setRelatedPosts(related || []);
    }
    setLoading(false);
  }

  async function fetchComments() {
    const { data } = await supabase
      .from('blog_comments')
      .select('*')
      .eq('post_slug', params.slug)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    setComments(data || []);
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;

    const { error } = await supabase.from('blog_comments').insert([{
      post_slug: params.slug,
      author_name: commentName || 'Anonymous',
      author_email: commentEmail,
      content: commentText,
      is_approved: false, // Requires admin approval
    }]);

    if (!error) {
      setCommentText('');
      setCommentName('');
      setCommentEmail('');
      alert('Comment submitted for review!');
    }
  }

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

  if (!post) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-black text-[var(--text-primary)] mb-4">Page not found</h1>
          <p className="text-[var(--text-secondary)] mb-8">The page you are looking for doesn't exist or has been moved.</p>
          <div className="flex gap-4">
            <Link href="/" className="bg-gradient-orange-green text-white px-6 py-2 rounded-full">Back to Home</Link>
            <Link href="/contact" className="border border-[var(--border)] px-6 py-2 rounded-full">Contact Support</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-[var(--bg-page)]">
        {/* Hero with Image on Top */}
        <div className="relative">
          {post.featured_image && (
            <div className="aspect-[21/9] w-full overflow-hidden">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="max-w-4xl mx-auto px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags?.map(tag => (
                <span key={tag} className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] mb-6">
              <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              {post.read_time && <span>• {post.read_time}</span>}
              {post.author && <span>• By {post.author}</span>}
            </div>
            <p className="text-xl text-[var(--text-secondary)] italic border-l-4 border-[var(--accent)] pl-4">
              {post.excerpt}
            </p>
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-3xl mx-auto px-5 py-8 sm:px-6 md:px-10 lg:px-12">
          <div
            className="prose prose-lg max-w-none
              prose-headings:text-[var(--text-primary)]
              prose-h1:text-3xl prose-h1:font-bold
              prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8
              prose-p:text-[var(--text-secondary)]
              prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[var(--text-primary)]
              prose-ul:text-[var(--text-secondary)]
              prose-li:text-[var(--text-secondary)]
              prose-img:rounded-xl prose-img:w-full
              prose-blockquote:border-l-[var(--accent)] prose-blockquote:text-[var(--text-secondary)]"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* Tags Section */}
        <div className="max-w-3xl mx-auto px-5 py-8 sm:px-6 md:px-10 lg:px-12 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-2">
            {post.tags?.map(tag => (
              <span key={tag} className="px-3 py-1 bg-[var(--bg-section)] text-[var(--text-secondary)] rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Read Next Section */}
        {relatedPosts.length > 0 && (
          <section className="max-w-7xl mx-auto px-5 py-12 sm:px-6 md:px-10 lg:px-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Read Next</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map(related => (
                <Link key={related.id} href={`/blog/${related.slug}`} className="group">
                  <div className="rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition">
                    {related.featured_image && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={related.featured_image}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] line-clamp-2">
                        {related.title}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] mt-2">
                        {new Date(related.published_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="max-w-3xl mx-auto px-5 py-12 sm:px-6 md:px-10 lg:px-12 border-t border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Leave a comment</h2>
          
          {/* Existing Comments */}
          {comments.length > 0 && (
            <div className="mb-8 space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="bg-[var(--bg-section)] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-orange-green flex items-center justify-center text-white font-bold">
                      {comment.author_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{comment.author_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{new Date(comment.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-[var(--text-secondary)]">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <form onSubmit={handleComment} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Your Name"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)]"
              />
              <input
                type="email"
                placeholder="Your Email (not published)"
                value={commentEmail}
                onChange={(e) => setCommentEmail(e.target.value)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)]"
              />
            </div>
            <textarea
              rows={5}
              placeholder="Share your thoughts..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] resize-none"
            />
            <button
              type="submit"
              className="bg-gradient-orange-green text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition"
            >
              Post Comment
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}