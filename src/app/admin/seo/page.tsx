'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SEOSetting {
  id: string
  page_url: string
  meta_title: string
  meta_description: string
  meta_keywords: string
  og_title: string
  og_description: string
  og_image: string
  canonical_url: string
  no_index: boolean
  no_follow: boolean
  updated_at: string
}

export default function SEOToolsPage() {
  const [settings, setSettings] = useState<SEOSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<SEOSetting | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    page_url: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    no_index: false,
    no_follow: false
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [generatingSitemap, setGeneratingSitemap] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchSettings()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('seo_settings')
      .select('*')
      .order('page_url')
    
    setSettings(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      page_url: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_title: '',
      og_description: '',
      og_image: '',
      canonical_url: '',
      no_index: false,
      no_follow: false
    })
    setEditingItem(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (editingItem) {
      const { error } = await supabase
        .from('seo_settings')
        .update({
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          meta_keywords: formData.meta_keywords,
          og_title: formData.og_title,
          og_description: formData.og_description,
          og_image: formData.og_image,
          canonical_url: formData.canonical_url,
          no_index: formData.no_index,
          no_follow: formData.no_follow,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'SEO settings updated successfully!' })
        fetchSettings()
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from('seo_settings')
        .insert([formData])

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'SEO settings created successfully!' })
        fetchSettings()
        resetForm()
      }
    }
    setSaving(false)
  }

  const handleEdit = (item: SEOSetting) => {
    setEditingItem(item)
    setFormData({
      page_url: item.page_url,
      meta_title: item.meta_title || '',
      meta_description: item.meta_description || '',
      meta_keywords: item.meta_keywords || '',
      og_title: item.og_title || '',
      og_description: item.og_description || '',
      og_image: item.og_image || '',
      canonical_url: item.canonical_url || '',
      no_index: item.no_index || false,
      no_follow: item.no_follow || false
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string, pageUrl: string) => {
    if (confirm(`Delete SEO settings for "${pageUrl}"?`)) {
      const { error } = await supabase
        .from('seo_settings')
        .delete()
        .eq('id', id)

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'SEO settings deleted successfully!' })
        fetchSettings()
      }
    }
  }

  const generateSitemap = async () => {
    setGeneratingSitemap(true)
    setMessage(null)

    try {
      const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('slug, updated_at')
        .eq('status', 'published')

      const { data: projects } = await supabase
        .from('projects')
        .select('id, updated_at')
        .eq('status', 'published')

      const { data: seoPages } = await supabase
        .from('seo_settings')
        .select('page_url, updated_at')

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

      const staticPages = ['/', '/about', '/services', '/projects', '/contact', '/blog', '/faq']
      staticPages.forEach(page => {
        sitemap += `  <url>\n`
        sitemap += `    <loc>${baseUrl}${page}</loc>\n`
        sitemap += `    <lastmod>${new Date().toISOString()}</lastmod>\n`
        sitemap += `    <changefreq>weekly</changefreq>\n`
        sitemap += `    <priority>${page === '/' ? '1.0' : '0.8'}</priority>\n`
        sitemap += `  </url>\n`
      })

      blogPosts?.forEach(post => {
        sitemap += `  <url>\n`
        sitemap += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`
        sitemap += `    <lastmod>${post.updated_at}</lastmod>\n`
        sitemap += `    <changefreq>monthly</changefreq>\n`
        sitemap += `    <priority>0.6</priority>\n`
        sitemap += `  </url>\n`
      })

      projects?.forEach(project => {
        sitemap += `  <url>\n`
        sitemap += `    <loc>${baseUrl}/projects/${project.id}</loc>\n`
        sitemap += `    <lastmod>${project.updated_at}</lastmod>\n`
        sitemap += `    <changefreq>monthly</changefreq>\n`
        sitemap += `    <priority>0.7</priority>\n`
        sitemap += `  </url>\n`
      })

      sitemap += '</urlset>'

      const response = await fetch('/api/sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemap })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Sitemap generated successfully! View at /sitemap.xml' })
      } else {
        throw new Error('Failed to save sitemap')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate sitemap' })
    } finally {
      setGeneratingSitemap(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading SEO settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">SEO Tools</h2>
          <p className="text-sm text-gray-500 mt-1">Manage meta tags, generate sitemap, and optimize for search engines</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateSitemap}
            disabled={generatingSitemap}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {generatingSitemap ? 'Generating...' : 'Generate Sitemap'}
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              + Add Page SEO
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? 'Edit SEO Settings' : 'Add SEO Settings'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingItem && (
              <div>
                <label className="block text-sm font-medium mb-1">Page URL *</label>
                <input
                  type="text"
                  required
                  value={formData.page_url}
                  onChange={(e) => setFormData({ ...formData, page_url: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="/example-page"
                />
                <p className="text-xs text-gray-400 mt-1">Example: /about, /services, /custom-page</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Meta Title</label>
              <input
                type="text"
                value={formData.meta_title}
                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Page title for search engines (50-60 characters)"
              />
              <p className="text-xs text-gray-400 mt-1">{formData.meta_title.length}/60 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Meta Description</label>
              <textarea
                value={formData.meta_description}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                rows={2}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Brief description for search results (150-160 characters)"
              />
              <p className="text-xs text-gray-400 mt-1">{formData.meta_description.length}/160 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Meta Keywords (comma separated)</label>
              <input
                type="text"
                value={formData.meta_keywords}
                onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="web design, development, SEO"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">OG Title (Social Media)</label>
                <input
                  type="text"
                  value={formData.og_title}
                  onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Title for social media sharing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">OG Image URL</label>
                <input
                  type="text"
                  value={formData.og_image}
                  onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">OG Description (Social Media)</label>
              <textarea
                value={formData.og_description}
                onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                rows={2}
                className="w-full p-2 border rounded-lg"
                placeholder="Description for social media sharing"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Canonical URL</label>
              <input
                type="text"
                value={formData.canonical_url}
                onChange={(e) => setFormData({ ...formData, canonical_url: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="https://example.com/preferred-url"
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.no_index}
                  onChange={(e) => setFormData({ ...formData, no_index: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">No Index (hide from search engines)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.no_follow}
                  onChange={(e) => setFormData({ ...formData, no_follow: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">No Follow (don't follow links)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">Page URL</th>
                <th className="p-4 text-left">Meta Title</th>
                <th className="p-4 text-left">Meta Description</th>
                <th className="p-4 text-left">Robots</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {settings.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">{item.page_url}</td>
                  <td className="p-4 max-w-xs">
                    <p className="text-sm truncate">{item.meta_title || '-'}</p>
                  </td>
                  <td className="p-4 max-w-md">
                    <p className="text-sm text-gray-500 truncate">{item.meta_description || '-'}</p>
                  </td>
                  <td className="p-4">
                    {(item.no_index || item.no_follow) && (
                      <div className="flex gap-1">
                        {item.no_index && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">noindex</span>}
                        {item.no_follow && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">nofollow</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.page_url)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-3">SEO Best Practices</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
          <ul className="space-y-2">
            <li>✓ Meta titles should be 50-60 characters</li>
            <li>✓ Meta descriptions should be 150-160 characters</li>
            <li>✓ Use unique titles and descriptions for each page</li>
            <li>✓ Include target keywords naturally</li>
          </ul>
          <ul className="space-y-2">
            <li>✓ Generate sitemap.xml after adding new content</li>
            <li>✓ Submit sitemap to Google Search Console</li>
            <li>✓ Use OG tags for better social media sharing</li>
            <li>✓ Set canonical URLs to avoid duplicate content</li>
          </ul>
        </div>
      </div>
    </div>
  )
}