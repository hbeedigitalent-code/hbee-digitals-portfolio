'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageUtilities from '@/components/ui/PageUtilities';

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

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  published_at: string;
  read_time: string;
}

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (params?.slug) {
      fetchPost();
      fetchComments();
    }
  }, [params?.slug]);

  async function fetchPost() {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      if (data) {
        setPost(data);
        
        // Fetch related posts (only need these fields)
        const { data: related } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, featured_image, published_at, read_time')
          .eq('status', 'published')
          .eq('post_type', 'blog')
          .neq('id', data.id)
          .limit(3);
        
        setRelatedPosts(related || []);
      }
    } catch (err) {
      console.error('Error fetching post:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('post_slug', params.slug)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    
    if (!commentText.trim()) {
      setCommentStatus('error');
      setTimeout(() => setCommentStatus('idle'), 3000);
      return;
    }

    setCommentStatus('submitting');

    try {
      const { error } = await supabase.from('blog_comments').insert({
        post_slug: params.slug,
        author_name: commentName.trim() || 'Anonymous',
        author_email: commentEmail.trim() || null,
        content: commentText.trim(),
        is_approved: false,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      setCommentStatus('success');
      setCommentText('');
      setCommentName('');
      setCommentEmail('');
      
      setTimeout(() => setCommentStatus('idle'), 3000);
    } catch (err) {
      console.error('Comment error:', err);
      setCommentStatus('error');
      setTimeout(() => setCommentStatus('idle'), 3000);
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = post?.title || '';

  // Helper to render HTML content safely
  const renderHTML = (htmlString: string) => {
    if (!htmlString) return '<p>Content coming soon...</p>';
    return htmlString;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]" />
        </div>
        <Footer />
        <PageUtilities />
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
          <Link href="/blog" className="bg-gradient-orange-green text-white px-6 py-2 rounded-full">
            Back to Blog
          </Link>
        </div>
        <Footer />
        <PageUtilities />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-[var(--bg-page)] min-h-screen">
        {/* Featured Image - 16:9 Aspect Ratio */}
        {post.featured_image && (
          <div className="w-full bg-[var(--bg-section)]">
            <div className="max-w-6xl mx-auto">
              <div className="aspect-video overflow-hidden">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* Content Container - Centered */}
        <div className="max-w-3xl mx-auto px-5 py-12 sm:px-6 md:px-0">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags?.map((tag, idx) => (
              <span key={idx} className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-4">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)] mb-6 pb-6 border-b border-[var(--border)]">
            <span className="flex items-center gap-1">
              <img src="/svgs/calendar.svg" alt="Date" className="w-4 h-4" />
              {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            {post.read_time && (
              <span className="flex items-center gap-1">
                <img src="/svgs/clock.svg" alt="Read time" className="w-4 h-4" />
                {post.read_time}
              </span>
            )}
            {post.author && (
              <span className="flex items-center gap-1">
                <img src="/svgs/user.svg" alt="Author" className="w-4 h-4" />
                By {post.author}
              </span>
            )}
          </div>

          {/* Social Share Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="text-sm font-bold text-[var(--text-primary)]">Share:</span>
            
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition"
            >
              <img src="/svgs/whatsapp.svg" alt="WhatsApp" className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">WhatsApp</span>
            </a>

            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition"
            >
              <img src="/svgs/linkedin.svg" alt="LinkedIn" className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">LinkedIn</span>
            </a>

            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition"
            >
              <img src="/svgs/twitter.svg" alt="Twitter" className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Twitter</span>
            </a>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition"
            >
              <img src="/svgs/facebook.svg" alt="Facebook" className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">Facebook</span>
            </a>

            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition"
            >
              <img src="/svgs/link.svg" alt="Copy link" className="w-4 h-4" />
              <span className="text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Excerpt */}
          <div className="text-xl text-[var(--text-secondary)] italic border-l-4 border-[var(--accent)] pl-4 mb-8">
            {post.excerpt}
          </div>

          {/* Article Content - HTML Rendering with proper styling */}
          <div 
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: renderHTML(post.content) }}
          />

          {/* Tags Footer */}
          <div className="flex flex-wrap gap-2 pt-8 mt-8 border-t border-[var(--border)]">
            {post.tags?.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-[var(--bg-section)] text-[var(--text-secondary)] rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Read Next Section */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-[var(--border)] py-16">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 md:px-10">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Read Next</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((related) => (
                  <Link key={related.id} href={`/blog/${related.slug}`} className="group">
                    <div className="rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition bg-[var(--bg-card)]">
                      {related.featured_image && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={related.featured_image}
                            alt={related.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
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
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="border-t border-[var(--border)] py-16">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 md:px-0">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Leave a comment</h2>
            
            {comments.length > 0 && (
              <div className="mb-8 space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-[var(--bg-section)] rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-orange-green flex items-center justify-center text-white font-bold">
                        {comment.author_name.charAt(0).toUpperCase()}
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

            {commentStatus === 'success' && (
              <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-4 text-center">
                ✓ Comment submitted for review! It will appear once approved.
              </div>
            )}

            {commentStatus === 'error' && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-4 text-center">
                ✗ Something went wrong. Please try again.
              </div>
            )}

            <form onSubmit={handleComment} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Your Email (not published)"
                  value={commentEmail}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  className="px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <textarea
                rows={5}
                placeholder="Share your thoughts..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] resize-none focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={commentStatus === 'submitting'}
                className="bg-gradient-orange-green text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition disabled:opacity-50"
              >
                {commentStatus === 'submitting' ? 'Submitting...' : 'Post Comment'}
              </button>
            </form>
          </div>
        </section>
      </main>
      <PageUtilities />
      <Footer />
    </>
  );
}