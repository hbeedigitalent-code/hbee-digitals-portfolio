'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

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
  const [originalStatus, setOriginalStatus] = useState('draft')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaLink, setCtaLink] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const { id } = useParams()

  // Auto‑clear message after 4 seconds
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [message])

  useEffect(() => {
    fetchCategories()
    fetchPost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const { data } = await supabase.from('blog_posts').select('*').eq('id', id).single()
    if (data) {
      setTitle(data.title)
      setSlug(data.slug)
      setExcerpt(data.excerpt || '')
      setContent(data.content)
      setFeaturedImage(data.featured_image || '')
      setCategoryId(data.category_id || '')
      setStatus(data.status)
      setOriginalStatus(data.status)
      setMetaTitle(data.meta_title || '')
      setMetaDescription(data.meta_description || '')
      setCtaText(data.cta_text || '')
      setCtaLink(data.cta_link || '')
    }
    setFetching(false)
  }

  const generateSlug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const handleTitleChange = (value: string) => {
    setTitle(value)
    // Only auto‑fill slug if slug is empty or still matches the old auto‑generated slug
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }
    setUploading(true)
    setMessage(null)
    try {
      const fileName = `blog-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
      if (urlData?.publicUrl) {
        setFeaturedImage(urlData.publicUrl)
        setMessage({ type: 'success', text: 'Image uploaded successfully!' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Upload failed' })
    } finally {
      setUploading(false)
      // Reset file input so the same file can be re‑uploaded
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertFormatTag = useCallback(
    (tag: string) => {
      const textarea = contentRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)
      let newText = ''
      switch (tag) {
        case 'bold':
          newText = `<strong>${selectedText || 'bold'}</strong>`
          break
        case 'italic':
          newText = `<em>${selectedText || 'italic'}</em>`
          break
        case 'underline':
          newText = `<u>${selectedText || 'underline'}</u>`
          break
        case 'h2':
          newText = `\n<h2>${selectedText || 'Heading 2'}</h2>\n`
          break
        case 'h3':
          newText = `\n<h3>${selectedText || 'Heading 3'}</h3>\n`
          break
        case 'link':
          newText = `<a href="https://" target="_blank" rel="noopener">${selectedText || 'link'}</a>`
          break
        case 'list':
          newText = `\n<ul>\n  <li>${selectedText || 'item'}</li>\n</ul>\n`
          break
        case 'image':
          newText = `<img src="${selectedText || 'https://'}" alt="Image" class="rounded-lg w-full" />`
          break
        case 'code':
          newText = `<pre><code>${selectedText || 'code'}</code></pre>`
          break
        case 'quote':
          newText = `<blockquote>${selectedText || 'quote'}</blockquote>`
          break
        case 'hr':
          newText = '\n<hr class="my-8 border-gray-200" />\n'
          break
        default:
          return
      }
      const updated =
        content.substring(0, start) + newText + content.substring(end)
      setContent(updated)
      // Restore cursor position after React re‑render
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + newText.length, start + newText.length)
      }, 0)
    },
    [content]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const finalSlug = slug || generateSlug(title)

    // Determine published_at: set only when status changes to published
    let publishedAt: string | null = null
    if (status === 'published' && originalStatus !== 'published') {
      publishedAt = new Date().toISOString()
    }

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
        meta_title: metaTitle,
        meta_description: metaDescription,
        cta_text: ctaText,
        cta_link: ctaLink,
        updated_at: new Date().toISOString(),
        ...(publishedAt ? { published_at: publishedAt } : {}),
      })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Post updated successfully!' })
      // Navigate back after a short delay so the user sees the success message
      setTimeout(() => router.push('/admin/blog'), 800)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      router.push('/admin/blog')
    }
  }

  if (fetching)
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-2 text-gray-600">Loading post...</p>
      </div>
    )

  const toolbarButtons = [
    { tag: 'bold', label: 'B', title: 'Bold', className: 'font-bold' },
    { tag: 'italic', label: 'I', title: 'Italic', className: 'italic' },
    { tag: 'underline', label: 'U', title: 'Underline', className: 'underline' },
    { tag: 'h2', label: 'H2', title: 'Heading 2', className: 'font-bold text-sm' },
    { tag: 'h3', label: 'H3', title: 'Heading 3', className: 'font-bold text-xs' },
    { tag: 'link', label: '🔗', title: 'Link', className: '' },
    { tag: 'list', label: '📋', title: 'List', className: '' },
    { tag: 'image', label: '🖼', title: 'Image', className: '' },
    { tag: 'code', label: '⌨', title: 'Code', className: '' },
    { tag: 'quote', label: '❝', title: 'Quote', className: '' },
    { tag: 'hr', label: '—', title: 'Horizontal Rule', className: '' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Edit Post</h2>
        <Link
          href="/admin/blog"
          className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title & Slug */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full p-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter post title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="auto-generated-from-title"
            />
            <p className="text-xs text-gray-400 mt-1">URL: /blog/{slug || '...'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Short description for previews..."
            />
          </div>
        </div>

        {/* Featured Image */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium mb-2">Featured Image</label>
          <div className="flex items-center gap-4 flex-wrap">
            {featuredImage && (
              <img
                src={featuredImage}
                alt="Featured preview"
                className="h-20 rounded-lg object-cover border"
              />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Image
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <input
            type="text"
            value={featuredImage}
            onChange={(e) => setFeaturedImage(e.target.value)}
            className="w-full p-2.5 border rounded-lg mt-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Or paste image URL"
          />
        </div>

        {/* Content Editor */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium mb-2">Content * (HTML supported)</label>
          <div className="flex flex-wrap gap-1 mb-3 p-2 bg-gray-50 rounded-lg border">
            {toolbarButtons.map((btn) => (
              <button
                key={btn.tag}
                type="button"
                onClick={() => insertFormatTag(btn.tag)}
                title={btn.title}
                className={`px-3 py-1.5 rounded text-sm hover:bg-white hover:shadow-sm transition border border-transparent hover:border-gray-300 ${btn.className}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <textarea
            id="content-editor"
            ref={contentRef}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="w-full p-4 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="<p>Write your content here...</p>"
          />
        </div>

        {/* Category & Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEO Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">SEO Settings</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="SEO title (defaults to post title if empty)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Meta Description</label>
              <input
                type="text"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="SEO description"
              />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Call-to-Action (Bottom of Post)</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">CTA Text</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Get Started"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">CTA Link</label>
              <input
                type="text"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="/contact"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium flex items-center gap-2 transition"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              'Update Post'
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
          >
            Delete Post
          </button>
          <Link
            href="/admin/blog"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition inline-flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}