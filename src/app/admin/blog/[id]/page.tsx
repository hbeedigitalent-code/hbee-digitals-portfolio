'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'

interface Category {
  id: string
  name: string
}

export default function EditBlogPost() {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('draft')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => {
    fetchCategories()
    fetchPost()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('blog_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order')
    setCategories(data || [])
  }

  const fetchPost = async () => {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (data) {
      setTitle(data.title)
      setSlug(data.slug)
      setExcerpt(data.excerpt || '')
      setContent(data.content)
      setFeaturedImage(data.featured_image || '')
      setCategoryId(data.category_id || '')
      setStatus(data.status)
    }
    setFetching(false)
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const finalSlug = slug || generateSlug(title)

    const { error } = await supabase
      .from('blog_posts')
      .update({
        title,
        slug: finalSlug,
        excerpt,
        content,
        featured_image: featuredImage,
        category_id: categoryId || null,
        status,
        updated_at: new Date().toISOString(),
        published_at: status === 'published' && !fetching ? new Date().toISOString() : undefined
      })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/admin/blog')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this post? This action cannot be undone.')) {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Error: ' + error.message)
      } else {
        router.push('/admin/blog')
      }
    }
  }

  if (fetching) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading post...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Edit Post</h2>
        <Link href="/admin/blog" className="text-gray-600 hover:text-gray-800">← Back</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full p-2 border rounded-lg bg-gray-50"
            placeholder="auto-generated-from-title"
          />
          <p className="text-xs text-gray-400 mt-1">URL: /blog/{slug || '...'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Short summary of the post..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Content *</label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full p-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Write your blog post content here..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Featured Image</label>
          <ImageUpload
            onUpload={setFeaturedImage}
            currentImage={featuredImage}
            folder="blog"
            label="Upload featured image"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? 'Saving...' : 'Update Post'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Delete Post
          </button>
          <Link href="/admin/blog" className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}