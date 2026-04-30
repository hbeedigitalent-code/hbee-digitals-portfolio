'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'

export default function NewBlogPost() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(false)
  const [useRichText, setUseRichText] = useState(true)
  const router = useRouter()

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const insertFormat = (type: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    let newText = text
    let newStart = start
    
    switch(type) {
      case 'bold':
        newText = text.substring(0, start) + '<strong>' + text.substring(start, end) + '</strong>' + text.substring(end)
        newStart = start + 8
        break
      case 'italic':
        newText = text.substring(0, start) + '<em>' + text.substring(start, end) + '</em>' + text.substring(end)
        newStart = start + 5
        break
      case 'link':
        const url = prompt('Enter URL:', 'https://')
        if (url) {
          newText = text.substring(0, start) + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + (text.substring(start, end) || 'link text') + '</a>' + text.substring(end)
          newStart = start + 20 + url.length
        }
        break
      case 'list':
        newText = text.substring(0, start) + '<ul><li>' + text.substring(start, end).split('\n').join('</li><li>') + '</li></ul>' + text.substring(end)
        newStart = start + 10
        break
      case 'h2':
        newText = text.substring(0, start) + '<h2>' + text.substring(start, end) + '</h2>' + text.substring(end)
        newStart = start + 8
        break
      default:
        newText = text
    }
    
    setContent(newText)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newStart, newStart)
    }, 10)
  }

  const insertImage = (url: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement
    if (!textarea) return
    
    const start = textarea.selectionStart
    const newText = content.substring(0, start) + `<img src="${url}" alt="Blog image" class="my-4 rounded-lg" />` + content.substring(start)
    setContent(newText)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const slug = generateSlug(title)

    const { error } = await supabase.from('blog_posts').insert([
      {
        title,
        slug,
        content: content,
        featured_image: featuredImage,
        category_id: categoryId || null,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null
      }
    ])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      router.push('/admin/blog')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Create New Post</h2>
        <Link href="/admin/blog" className="text-gray-600 hover:text-gray-800">← Back</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Rich Text Editor Toolbar */}
        <div>
          <label className="block text-sm font-medium mb-2">Content *</label>
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 rounded-lg border">
            <button type="button" onClick={() => insertFormat('bold')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm font-bold" title="Bold">B</button>
            <button type="button" onClick={() => insertFormat('italic')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm italic" title="Italic">I</button>
            <button type="button" onClick={() => insertFormat('h2')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm font-semibold" title="Heading">H2</button>
            <button type="button" onClick={() => insertFormat('link')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Insert Link">🔗</button>
            <button type="button" onClick={() => insertFormat('list')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Bullet List">📋</button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ImageUpload
              onUpload={(url) => {
                setFeaturedImage(url)
                insertImage(url)
              }}
              currentImage=""
              folder="blog"
              label="Insert Image"
            />
          </div>
          <textarea
            id="content"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="w-full p-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Write your blog post content here... Use the toolbar to format text, add links, and insert images."
          />
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">📖 Preview:</p>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content || 'Your formatted content will appear here...' }} />
          </div>
        </div>

        {/* Featured Image */}
        <div>
          <ImageUpload
            onUpload={setFeaturedImage}
            currentImage={featuredImage}
            folder="blog"
            label="Featured Image"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g., Technology, Design, Marketing"
            />
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
            {loading ? 'Saving...' : 'Publish Post'}
          </button>
          <Link href="/admin/blog" className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}