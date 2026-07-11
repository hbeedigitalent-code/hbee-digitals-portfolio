// src/app/admin/blog/categories/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string | null
  post_count?: number
}

export default function AdminBlogCategoriesPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<unknown>(null)
  const [actionMessage, setActionMessage] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

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

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      setLoading(true)

      const { data: catData, error: catError } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name', { ascending: true })

      if (catError) {
        console.log('Categories table may not exist, using tags from posts')
        await fetchTagsFromPosts()
      } else {
        setCategories(catData || [])
      }

      setLoading(false)
    }

    if (user) fetchCategories()
  }, [user])

  // Fetch tags from posts as fallback
  async function fetchTagsFromPosts() {
    const { data } = await supabase
      .from('blog_posts')
      .select('tags')
      .eq('status', 'published')

    const tagMap = new Map<string, { count: number }>()
    data?.forEach((post) => {
      post.tags?.forEach((tag: string) => {
        if (tag?.trim()) {
          const existing = tagMap.get(tag.trim())
          tagMap.set(tag.trim(), { count: (existing?.count || 0) + 1 })
        }
      })
    })

    const tagCategories: BlogCategory[] = Array.from(tagMap.entries()).map(
      ([name, data], index) => ({
        id: `tag-${index}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description: null,
        created_at: null,
        post_count: data.count,
      })
    )

    setCategories(tagCategories)
  }

  // Auto-generate slug
  useEffect(() => {
    if (name && !isEditing) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
      )
    }
  }, [name, isEditing])

  // Save category
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !slug.trim()) return

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    }

    try {
      if (isEditing && editId) {
        const { error } = await supabase
          .from('blog_categories')
          .update(payload)
          .eq('id', editId)

        if (error) throw error
        setActionMessage('Category updated!')
      } else {
        const { error } = await supabase
          .from('blog_categories')
          .insert({ ...payload, created_at: new Date().toISOString() })

        if (error) throw error
        setActionMessage('Category created!')
      }

      // Reset form
      setName('')
      setSlug('')
      setDescription('')
      setIsEditing(false)
      setEditId(null)

      // Refresh
      const { data } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name', { ascending: true })

      setCategories(data || [])
      setTimeout(() => setActionMessage(''), 3000)
    } catch (err) {
      setActionMessage(`Error: ${(err as Error).message}`)
    }
  }

  // Edit category
  function startEdit(cat: BlogCategory) {
    setName(cat.name)
    setSlug(cat.slug)
    setDescription(cat.description || '')
    setIsEditing(true)
    setEditId(cat.id)
  }

  // Delete category
  async function deleteCategory(id: string) {
    if (!confirm('Delete this category?')) return

    const { error } = await supabase
      .from('blog_categories')
      .delete()
      .eq('id', id)

    if (error) {
      setActionMessage(`Error: ${error.message}`)
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setActionMessage('Category deleted')
      setTimeout(() => setActionMessage(''), 3000)
    }
  }

  // Reset form
  function resetForm() {
    setName('')
    setSlug('')
    setDescription('')
    setIsEditing(false)
    setEditId(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-[-0.02em] text-[var(--text-primary)]">
              Blog Categories
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage categories for organizing your blog posts
            </p>
          </div>

          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <SvgIcon name="chevron-left" size={16} color="var(--text-muted)" />
            Back to Blog
          </Link>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
              actionMessage.includes('Error')
                ? 'bg-red-500/10 text-red-500'
                : 'bg-[var(--accent-lime)]/10 text-[var(--accent-lime)]'
            }`}
          >
            {actionMessage}
          </div>
        )}

        {/* Category Form */}
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">
            {isEditing ? 'Edit Category' : 'Add Category'}
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ecommerce Growth"
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                  Slug *
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ecommerce-growth"
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--text-muted)]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for this category"
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-page)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-[var(--accent-lime)] px-6 py-2.5 text-sm font-black text-[var(--btn-primary-text)] transition hover:opacity-90"
              >
                {isEditing ? 'Update' : 'Add'} Category
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--bg-page)]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Categories List */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Posts</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-[var(--text-muted)]">
                      No categories yet. Create your first category above.
                    </td>
                  </tr>
                )}

                {categories.map((cat) => (
                  <tr key={cat.id} className="transition hover:bg-[var(--bg-page)]">
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-[var(--text-muted)]">
                          {cat.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-[var(--text-muted)]">
                        /blog?tag={cat.slug}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[var(--bg-page)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                        {cat.post_count || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(cat)}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-page)] hover:text-[var(--accent)]"
                          title="Edit"
                        >
                          <SvgIcon name="edit" size={16} color="currentColor" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-500"
                          title="Delete"
                        >
                          <SvgIcon name="trash" size={16} color="currentColor" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}