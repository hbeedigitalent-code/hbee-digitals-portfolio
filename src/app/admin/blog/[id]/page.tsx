'use client'

import { useEffect, useState, useRef } from 'react'
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
  const router = useRouter()
  const { id } = useParams()

  useEffect(() => { fetchCategories(); fetchPost() }, [])

  const fetchCategories = async () => {
    const { data } = await supabase.from('blog_categories').select('id, name').eq('is_active', true).order('display_order')
    setCategories(data || [])
  }

  const fetchPost = async () => {
    const { data } = await supabase.from('blog_posts').select('*').eq('id', id).single()
    if (data) {
      setTitle(data.title); setSlug(data.slug); setExcerpt(data.excerpt || ''); setContent(data.content)
      setFeaturedImage(data.featured_image || ''); setCategoryId(data.category_id || ''); setStatus(data.status)
      setMetaTitle(data.meta_title || ''); setMetaDescription(data.meta_description || '')
      setCtaText(data.cta_text || ''); setCtaLink(data.cta_link || '')
    }
    setFetching(false)
  }

  const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleTitleChange = (value: string) => { setTitle(value); if (!slug || slug === generateSlug(title)) setSlug(generateSlug(value)) }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setMessage({ type: 'error', text: 'Please upload an image' }); return }
    setUploading(true)
    try {
      const fileName = `blog-${Date.now()}-${file.name}`
      await supabase.storage.from('images').upload(fileName, file, { cacheControl: '3600', upsert: true })
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
      if (urlData?.publicUrl) { setFeaturedImage(urlData.publicUrl); setMessage({ type: 'success', text: 'Image uploaded!' }) }
    } catch (err: any) { setMessage({ type: 'error', text: err.message }) } finally { setUploading(false) }
  }

  const insertFormatTag = (tag: string) => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement; if (!textarea) return
    const start = textarea.selectionStart; const end = textarea.selectionEnd; const selectedText = content.substring(start, end)
    let newText = ''
    switch (tag) {
      case 'bold': newText = `<strong>${selectedText || 'bold'}</strong>`; break
      case 'italic': newText = `<em>${selectedText || 'italic'}</em>`; break
      case 'underline': newText = `<u>${selectedText || 'underline'}</u>`; break
      case 'h2': newText = `\n<h2>${selectedText || 'Heading 2'}</h2>\n`; break
      case 'h3': newText = `\n<h3>${selectedText || 'Heading 3'}</h3>\n`; break
      case 'link': newText = `<a href="https://" target="_blank" rel="noopener">${selectedText || 'link'}</a>`; break
      case 'list': newText = `\n<ul>\n  <li>${selectedText || 'item'}</li>\n</ul>\n`; break
      case 'image': newText = `<img src="${selectedText || 'https://'}" alt="Image" class="rounded-lg w-full" />`; break
      case 'code': newText = `<pre><code>${selectedText || 'code'}</code></pre>`; break
      case 'quote': newText = `<blockquote>${selectedText || 'quote'}</blockquote>`; break
      case 'hr': newText = '\n<hr class="my-8 border-gray-200" />\n'; break
    }
    setContent(content.substring(0, start) + newText + content.substring(end))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMessage(null)
    const { error } = await supabase.from('blog_posts').update({
      title, slug: slug || generateSlug(title), excerpt, content, featured_image: featuredImage,
      category_id: categoryId || null, status, meta_title: metaTitle, meta_description: metaDescription,
      cta_text: ctaText, cta_link: ctaLink,
      updated_at: new Date().toISOString(),
      published_at: status === 'published' && !fetching ? new Date().toISOString() : undefined
    }).eq('id', id)
    if (error) setMessage({ type: 'error', text: error.message })
    else router.push('/admin/blog')
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this post?')) {
      await supabase.from('blog_posts').delete().eq('id', id)
      router.push('/admin/blog')
    }
  }

  if (fetching) return <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" /><p className="mt-2 text-gray-600">Loading...</p></div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Edit Post</h2>
        <Link href="/admin/blog" className="text-gray-600 hover:text-gray-800 flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>Back</Link>
      </div>
      {message && <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Title *</label><input type="text" required value={title} onChange={(e) => handleTitleChange(e.target.value)} className="w-full p-3 border rounded-lg text-lg font-semibold" /></div>
          <div><label className="block text-sm font-medium mb-1">Slug</label><input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm" /><p className="text-xs text-gray-400 mt-1">URL: /blog/{slug || '...'}</p></div>
          <div><label className="block text-sm font-medium mb-1">Excerpt</label><textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full p-2.5 border rounded-lg" /></div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium mb-2">Featured Image</label>
          <div className="flex items-center gap-4 flex-wrap">
            {featuredImage && <img src={featuredImage} alt="Preview" className="h-20 rounded-lg object-cover border" />}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>{uploading ? 'Uploading...' : 'Upload Image'}</button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
          <input type="text" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} className="w-full p-2.5 border rounded-lg mt-3 text-sm" placeholder="Or paste image URL" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <label className="block text-sm font-medium mb-2">Content * (HTML supported)</label>
          <div className="flex flex-wrap gap-1 mb-3 p-2 bg-gray-50 rounded-lg border">
            {[{tag:'bold',label:'B',title:'Bold',class:'font-bold'},{tag:'italic',label:'I',title:'Italic',class:'italic'},{tag:'underline',label:'U',title:'Underline',class:'underline'},{tag:'h2',label:'H2',title:'Heading 2',class:'font-bold text-sm'},{tag:'h3',label:'H3',title:'Heading 3',class:'font-bold text-xs'},{tag:'link',label:'🔗',title:'Link',class:''},{tag:'list',label:'📋',title:'List',class:''},{tag:'image',label:'🖼',title:'Image',class:''},{tag:'code',label:'⌨',title:'Code',class:''},{tag:'quote',label:'❝',title:'Quote',class:''},{tag:'hr',label:'—',title:'HR',class:''}].map(btn=>(<button key={btn.tag} type="button" onClick={()=>insertFormatTag(btn.tag)} title={btn.title} className={`px-3 py-1.5 rounded text-sm hover:bg-white hover:shadow-sm transition border border-transparent hover:border-gray-300 ${btn.class}`}>{btn.label}</button>))}
          </div>
          <textarea id="content-editor" required value={content} onChange={(e) => setContent(e.target.value)} rows={15} className="w-full p-4 border rounded-lg font-mono text-sm" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Category</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full p-2.5 border rounded-lg"><option value="">Uncategorized</option>{categories.map(cat=>(<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div>
            <div><label className="block text-sm font-medium mb-1">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2.5 border rounded-lg"><option value="draft">Draft</option><option value="published">Published</option></select></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">SEO Settings</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1">Meta Title</label><input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">Meta Description</label><input type="text" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Call-to-Action</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1">CTA Text</label><input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Get Started" /></div>
            <div><label className="block text-xs font-medium mb-1">CTA Link</label><input type="text" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="/contact" /></div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium" style={{ backgroundColor: 'var(--primary-color)' }}>{loading ? 'Saving...' : 'Update Post'}</button>
          <button type="button" onClick={handleDelete} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete Post</button>
          <Link href="/admin/blog" className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</Link>
        </div>
      </form>
    </div>
  )
}