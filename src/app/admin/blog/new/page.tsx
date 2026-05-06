'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewBlogPost() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('draft')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaLink, setCtaLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const insertFormat = (type: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    let newText = text

    switch(type) {
      case 'bold':
        newText = text.substring(0, start) + '<strong>' + (selected || 'bold text') + '</strong>' + text.substring(end)
        break
      case 'italic':
        newText = text.substring(0, start) + '<em>' + (selected || 'italic text') + '</em>' + text.substring(end)
        break
      case 'underline':
        newText = text.substring(0, start) + '<u>' + (selected || 'underlined text') + '</u>' + text.substring(end)
        break
      case 'h2':
        newText = text.substring(0, start) + '\n<h2>' + (selected || 'Heading 2') + '</h2>\n' + text.substring(end)
        break
      case 'h3':
        newText = text.substring(0, start) + '\n<h3>' + (selected || 'Heading 3') + '</h3>\n' + text.substring(end)
        break
      case 'link':
        const url = prompt('Enter URL:', 'https://')
        if (url) newText = text.substring(0, start) + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + (selected || 'link text') + '</a>' + text.substring(end)
        break
      case 'list':
        newText = text.substring(0, start) + '\n<ul>\n  <li>' + (selected || 'item').split('\n').join('</li>\n  <li>') + '</li>\n</ul>\n' + text.substring(end)
        break
      case 'code':
        newText = text.substring(0, start) + '\n<pre><code>' + (selected || 'code') + '</code></pre>\n' + text.substring(end)
        break
      case 'quote':
        newText = text.substring(0, start) + '\n<blockquote>' + (selected || 'quote') + '</blockquote>\n' + text.substring(end)
        break
      case 'hr':
        newText = text.substring(0, start) + '\n<hr class="my-8 border-gray-200" />\n' + text.substring(end)
        break
    }

    setContent(newText)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start)
    }, 10)
  }

  const insertImageTag = (url: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const newText = content.substring(0, start) + `<img src="${url}" alt="Blog image" class="my-4 rounded-lg w-full" />` + content.substring(start)
    setContent(newText)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage({ type: 'error', text: 'Please upload an image file' }); return }
    if (file.size > 5 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image must be less than 5MB' }); return }

    setUploading(true)
    try {
      const fileName = `blog-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
      if (urlData?.publicUrl) {
        setFeaturedImage(urlData.publicUrl)
        insertImageTag(urlData.publicUrl)
        setMessage({ type: 'success', text: 'Image uploaded!' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Upload failed: ' + err.message })
    } finally { setUploading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const slug = generateSlug(title)

    const { error } = await supabase.from('blog_posts').insert([{
      title,
      slug,
      excerpt,
      content,
      featured_image: featuredImage,
      category_id: categoryId || null,
      status,
      meta_title: metaTitle,
      meta_description: metaDescription,
      cta_text: ctaText,
      cta_link: ctaLink,
      views: 0,
      published_at: status === 'published' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])

    if (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message })
    } else {
      router.push('/admin/blog')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Create New Post</h2>
        <Link href="/admin/blog" className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </Link>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg font-semibold" placeholder="Enter blog post title" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Short summary (shown in blog listing)" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium mb-2">Featured Image</label>
          <div className="flex items-center gap-4 flex-wrap">
            {featuredImage && <img src={featuredImage} alt="Preview" className="h-20 rounded-lg object-cover border" />}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
          <input type="text" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} className="w-full p-2.5 border rounded-lg mt-3 text-sm" placeholder="Or paste image URL" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium mb-2">Content * (HTML supported)</label>
          <div className="flex flex-wrap gap-1 mb-3 p-2 bg-gray-50 rounded-lg border">
            {[
              { type: 'bold', label: 'B', title: 'Bold', class: 'font-bold' },
              { type: 'italic', label: 'I', title: 'Italic', class: 'italic' },
              { type: 'underline', label: 'U', title: 'Underline', class: 'underline' },
              { type: 'h2', label: 'H2', title: 'Heading 2', class: 'font-bold text-sm' },
              { type: 'h3', label: 'H3', title: 'Heading 3', class: 'font-bold text-xs' },
              { type: 'link', label: '🔗', title: 'Insert Link', class: '' },
              { type: 'list', label: '📋', title: 'Bullet List', class: '' },
              { type: 'code', label: '⌨', title: 'Code Block', class: '' },
              { type: 'quote', label: '❝', title: 'Blockquote', class: '' },
              { type: 'hr', label: '—', title: 'Horizontal Rule', class: '' },
            ].map(btn => (
              <button key={btn.type} type="button" onClick={() => insertFormat(btn.type)} title={btn.title}
                className={`px-3 py-1.5 rounded text-sm hover:bg-white hover:shadow-sm transition border border-transparent hover:border-gray-300 ${btn.class}`}>
                {btn.label}
              </button>
            ))}
          </div>
          <textarea
            id="content"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="w-full p-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="<h2>Start writing...</h2><p>Your content here. Use the toolbar to format text.</p>"
          />
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Preview:</p>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content || 'Your formatted content will appear here...' }} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input type="text" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="e.g., Technology, Design, Marketing" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2.5 border rounded-lg">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            SEO Settings
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1">Meta Title</label><input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Meta Description</label><input type="text" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
            Call-to-Action (shown at bottom of post)
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1">CTA Button Text</label><input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Get Started" /></div>
            <div><label className="block text-xs font-medium mb-1">CTA Button Link</label><input type="text" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="/contact" /></div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium" style={{ backgroundColor: 'var(--primary-color)' }}>
            {loading ? 'Creating...' : 'Publish Post'}
          </button>
          <Link href="/admin/blog" className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">Cancel</Link>
        </div>
      </form>
    </div>
  )
}