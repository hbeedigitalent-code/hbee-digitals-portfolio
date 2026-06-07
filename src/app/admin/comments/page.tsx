'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface BlogComment {
  id: string
  post_slug: string
  author_name: string
  author_email: string | null
  content: string
  is_approved: boolean
  created_at: string | null
}

export default function AdminCommentsPage() {
  const router = useRouter()
  const [comments, setComments] = useState<BlogComment[]>([])
  const [filteredComments, setFilteredComments] = useState<BlogComment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [actionMessage, setActionMessage] = useState('')
  const [user, setUser] = useState<unknown>(null)

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/admin/login')
        return
      }
      setUser(data.user)
    }
    checkAuth()
  }, [router])

  // Fetch comments
  useEffect(() => {
    async function fetchComments() {
      setLoading(true)
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching comments:', error)
      } else {
        setComments(data || [])
      }
      setLoading(false)
    }

    if (user) fetchComments()
  }, [user])

  // Filter comments
  useEffect(() => {
    if (filter === 'all') {
      setFilteredComments(comments)
    } else if (filter === 'pending') {
      setFilteredComments(comments.filter((c) => !c.is_approved))
    } else if (filter === 'approved') {
      setFilteredComments(comments.filter((c) => c.is_approved))
    }
  }, [filter, comments])

  // Approve comment
  async function approveComment(id: string) {
    const { error } = await supabase
      .from('blog_comments')
      .update({ is_approved: true })
      .eq('id', id)

    if (error) {
      setActionMessage(`Error: ${error.message}`)
    } else {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_approved: true } : c))
      )
      setActionMessage('Comment approved')
      setTimeout(() => setActionMessage(''), 3000)
    }
  }

  // Hide comment (unapprove)
  async function hideComment(id: string) {
    const { error } = await supabase
      .from('blog_comments')
      .update({ is_approved: false })
      .eq('id', id)

    if (error) {
      setActionMessage(`Error: ${error.message}`)
    } else {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_approved: false } : c))
      )
      setActionMessage('Comment hidden')
      setTimeout(() => setActionMessage(''), 3000)
    }
  }

  // Delete comment
  async function deleteComment(id: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return

    const { error } = await supabase.from('blog_comments').delete().eq('id', id)

    if (error) {
      setActionMessage(`Error: ${error.message}`)
    } else {
      setComments((prev) => prev.filter((c) => c.id !== id))
      setActionMessage('Comment deleted')
      setTimeout(() => setActionMessage(''), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39D97A] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
              Blog Comments
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {comments.length} total &middot;{' '}
              {comments.filter((c) => !c.is_approved).length} pending approval
            </p>
          </div>

          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            Back to Blog
          </Link>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className="mb-4 rounded-xl bg-[#39D97A]/10 px-4 py-3 text-sm font-semibold text-[#39D97A]">
            {actionMessage}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-1">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${
                filter === f
                  ? 'bg-[#39D97A] text-[#07111F]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {f}
              {f === 'all' && ` (${comments.length})`}
              {f === 'pending' && ` (${comments.filter((c) => !c.is_approved).length})`}
              {f === 'approved' && ` (${comments.filter((c) => c.is_approved).length})`}
            </button>
          ))}
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {filteredComments.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
              <img
                src="/svgs/comment.svg"
                alt=""
                className="mx-auto mb-4 h-12 w-12 opacity-20"
              />
              <p className="text-[var(--text-muted)]">No comments found</p>
            </div>
          )}

          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--text-muted)]/20"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  {/* Author info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07111F] text-xs font-black text-[#39D97A]">
                      {(comment.author_name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {comment.author_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        {comment.author_email && <span>{comment.author_email}</span>}
                        {comment.created_at && (
                          <span>
                            {new Date(comment.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post reference */}
                  <Link
                    href={`/blog/${comment.post_slug}`}
                    target="_blank"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#39D97A] hover:underline"
                  >
                    <img src="/svgs/link.svg" alt="" className="h-3 w-3" />
                    on /blog/{comment.post_slug}
                  </Link>

                  {/* Comment content */}
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                    {comment.content}
                  </p>
                </div>

                {/* Status + Actions */}
                <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      comment.is_approved
                        ? 'bg-[#39D97A]/10 text-[#39D97A]'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {comment.is_approved ? 'Approved' : 'Pending'}
                  </span>

                  <div className="flex items-center gap-1">
                    {!comment.is_approved ? (
                      <button
                        onClick={() => approveComment(comment.id)}
                        className="rounded-lg bg-[#39D97A]/10 px-3 py-1.5 text-xs font-bold text-[#39D97A] transition hover:bg-[#39D97A]/20"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => hideComment(comment.id)}
                        className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 transition hover:bg-amber-500/20"
                      >
                        Hide
                      </button>
                    )}

                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <span className="text-xs font-bold">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}