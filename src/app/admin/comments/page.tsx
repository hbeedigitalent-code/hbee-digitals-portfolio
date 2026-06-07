'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Comment = {
  id: string
  post_slug: string
  author_name: string
  author_email: string | null
  content: string
  is_approved: boolean
  created_at: string
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComments()
  }, [])

  async function fetchComments() {
    setLoading(true)

    const { data, error } = await supabase
      .from('blog_comments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setComments([])
    } else {
      setComments(data || [])
    }

    setLoading(false)
  }

  async function approveComment(id: string) {
    const { error } = await supabase
      .from('blog_comments')
      .update({ is_approved: true })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    fetchComments()
  }

  async function unapproveComment(id: string) {
    const { error } = await supabase
      .from('blog_comments')
      .update({ is_approved: false })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    fetchComments()
  }

  async function deleteComment(id: string) {
    if (!confirm('Delete this comment?')) return

    const { error } = await supabase.from('blog_comments').delete().eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setComments((prev) => prev.filter((comment) => comment.id !== id))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[var(--text-primary)]">
          Blog Comments
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Approve, hide, or delete comments submitted on Hbee Digitals blog posts.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            No comments yet.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {comments.map((comment) => (
              <div key={comment.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-[var(--text-primary)]">
                      {comment.author_name}
                    </p>

                    {comment.author_email && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {comment.author_email}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-[var(--accent)]">
                      /blog/{comment.post_slug}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      comment.is_approved
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'bg-orange-500/10 text-orange-500'
                    }`}
                  >
                    {comment.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>

                <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--text-secondary)]">
                  {comment.content}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {comment.is_approved ? (
                    <button
                      onClick={() => unapproveComment(comment.id)}
                      className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-black text-[var(--text-primary)]"
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => approveComment(comment.id)}
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-black text-[#07111F]"
                    >
                      Approve
                    </button>
                  )}

                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-500"
                  >
                    Delete
                  </button>

                  <span className="self-center text-xs text-[var(--text-muted)]">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}