'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Comment {
  id: string
  post_slug: string
  author_name: string
  author_email: string
  content: string
  is_approved: boolean
  created_at: string
  post_title?: string
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')

  useEffect(() => {
    fetchComments()
  }, [])

  async function fetchComments() {
    const { data } = await supabase
      .from('blog_comments')
      .select('*')
      .order('created_at', { ascending: false })

    // Fetch post titles for each comment
    const commentsWithTitles = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: post } = await supabase
          .from('blog_posts')
          .select('title')
          .eq('slug', comment.post_slug)
          .single()
        return { ...comment, post_title: post?.title || comment.post_slug }
      })
    )

    setComments(commentsWithTitles)
    setLoading(false)
  }

  async function approveComment(id: string) {
    const { error } = await supabase
      .from('blog_comments')
      .update({ is_approved: true })
      .eq('id', id)
    
    if (!error) {
      fetchComments()
    }
  }

  async function deleteComment(id: string) {
    if (confirm('Delete this comment?')) {
      const { error } = await supabase.from('blog_comments').delete().eq('id', id)
      if (!error) {
        fetchComments()
      }
    }
  }

  const filteredComments = comments.filter(comment => {
    if (filter === 'pending') return !comment.is_approved
    if (filter === 'approved') return comment.is_approved
    return true
  })

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">Blog Comments</h1>
          <p className="text-sm text-[var(--text-muted)]">Manage and approve comments from readers</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 text-sm font-bold transition ${
            filter === 'pending'
              ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Pending ({comments.filter(c => !c.is_approved).length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 text-sm font-bold transition ${
            filter === 'approved'
              ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Approved ({comments.filter(c => c.is_approved).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-bold transition ${
            filter === 'all'
              ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          All ({comments.length})
        </button>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center">
            <SvgIcon name="messages" size={48} color="var(--text-muted)" />
            <p className="mt-4 text-[var(--text-muted)]">No comments found</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-orange-green flex items-center justify-center text-white font-bold">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{comment.author_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{comment.author_email || 'No email'}</p>
                    </div>
                  </div>
                  <p className="text-[var(--text-secondary)] mb-2">{comment.content}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    On: <Link href={`/blog/${comment.post_slug}`} className="text-[var(--accent)] hover:underline">
                      {comment.post_title}
                    </Link>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {!comment.is_approved && (
                    <button
                      onClick={() => approveComment(comment.id)}
                      className="rounded-lg bg-green-500/20 px-3 py-1.5 text-sm font-bold text-green-400 hover:bg-green-500/30"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm font-bold text-red-400 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}