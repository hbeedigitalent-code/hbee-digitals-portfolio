'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
  const [copied, setCopied] = useState(false);
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
      // Fetch related posts
      const { data: related } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .eq('post_type', 'blog')
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
      is_approved: false,
    }]);

    if (!error) {
      setCommentText('');
      setCommentName('');
      setCommentEmail('');
      alert('Comment submitted for review!');
    }
  }

  const copyToClipboard = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = post?.title || '';

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
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="bg-[var(--bg-page)]">
        {/* Featured Image - Full width */}
        {post.featured_image && (
          <div className="w-full h-[400px] md:h-[500px] overflow-hidden">
            <img
              src={post.featured_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Centered Content Container */}
        <div className="max-w-3xl mx-auto px-5 py-12 sm:px-6 md:px-0">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags?.map(tag => (
              <span key={tag} className="text-xs bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-full">
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition"
            >
              <img src="/svgs/whatsapp.svg" alt="WhatsApp" className="w-4 h-4" />
              <span className="text-sm">WhatsApp</span>
            </a>

            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition"
            >
              <img src="/svgs/linkedin.svg" alt="LinkedIn" className="w-4 h-4" />
              <span className="text-sm">LinkedIn</span>
            </a>

            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition"
            >
              <img src="/svgs/twitter.svg" alt="Twitter" className="w-4 h-4" />
              <span className="text-sm">Twitter</span>
            </a>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition"
            >
              <img src="/svgs/facebook.svg" alt="Facebook" className="w-4 h-4" />
              <span className="text-sm">Facebook</span>
            </a>

            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition"
            >
              <img src="/svgs/link.svg" alt="Copy link" className="w-4 h-4" />
              <span className="text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Excerpt */}
          <div className="text-xl text-[var(--text-secondary)] italic border-l-4 border-[var(--accent)] pl-4 mb-8">
            {post.excerpt}
          </div>

          {/* Article Content - Proper HTML Formatting */}
          <div 
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags Footer */}
          <div className="flex flex-wrap gap-2 pt-8 mt-8 border-t border-[var(--border)]">
            {post.tags?.map(tag => (
              <span key={tag} className="px-3 py-1 bg-[var(--bg-section)] text-[var(--text-secondary)] rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Read Next Section - Centered */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-[var(--border)] py-16">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 md:px-10">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">Read Next</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map(related => (
                  <Link key={related.id} href={`/blog/${related.slug}`} className="group">
                    <div className="rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition bg-[var(--bg-card)]">
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
            </div>
          </section>
        )}

        {/* Comments Section - Centered */}
        <section className="border-t border-[var(--border)] py-16">
          <div className="max-w-3xl mx-auto px-5 sm:px-6 md:px-0">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Leave a comment</h2>
            
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

            <form onSubmit={handleComment} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Your Email (not published)"
                  value={commentEmail}
                  onChange={(e) => setCommentEmail(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>
              <textarea
                rows={5}
                placeholder="Share your thoughts..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-primary)] resize-none focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-gradient-orange-green text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition"
              >
                Post Comment
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />

      <style jsx global>{`
        .blog-content {
          font-size: 1.125rem;
          line-height: 1.8;
          color: var(--text-secondary);
        }
        
        .blog-content h1 {
          font-size: 2.25rem;
          font-weight: 800;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        
        .blog-content h2 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        
        .blog-content h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
        }
        
        .blog-content p {
          margin-bottom: 1.25rem;
          line-height: 1.8;
        }
        
        .blog-content a {
          color: var(--accent);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        
        .blog-content a:hover {
          text-decoration: none;
        }
        
        .blog-content ul, .blog-content ol {
          margin-bottom: 1.25rem;
          padding-left: 1.5rem;
        }
        
        .blog-content li {
          margin-bottom: 0.5rem;
        }
        
        .blog-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.5rem 0;
        }
        
        .blog-content blockquote {
          border-left: 4px solid var(--accent);
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: var(--text-muted);
        }
        
        .blog-content code {
          background: var(--bg-section);
          padding: 0.2rem 0.4rem;
          border-radius: 0.375rem;
          font-family: monospace;
          font-size: 0.875em;
        }
        
        .blog-content pre {
          background: var(--bg-section);
          padding: 1rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 1.5rem 0;
        }
        
        .blog-content pre code {
          background: none;
          padding: 0;
        }
        
        .blog-content hr {
          margin: 2rem 0;
          border-color: var(--border);
        }
      `}</style>
    </>
  );
}