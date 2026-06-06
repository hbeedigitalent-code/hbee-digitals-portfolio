'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ImageUpload from '@/components/ImageUpload'
import SvgIcon from '@/components/ui/SvgIcon'

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
})

import 'react-quill/dist/quill.snow.css'

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function NewBlogPost() {
  const router = useRouter()
  const [authors, setAuthors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Basic fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [altText, setAltText] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [readTime, setReadTime] = useState('8 min read')
  const [tags, setTags] = useState('')
  const [postType, setPostType] = useState('blog')
  const [isFeatured, setIsFeatured] = useState(false)
  const [status, setStatus] = useState('published')

  // Featured card fields
  const [featuredBadge, setFeaturedBadge] = useState('Growth Strategy')
  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')

  // CTA fields
  const [ctaText, setCtaText] = useState('Request a Growth Review')
  const [ctaLink, setCtaLink] = useState('/contact')

  // SEO fields
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [ogTitle, setOgTitle] = useState('')
  const [ogDescription, setOgDescription] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [socialCaption, setSocialCaption] = useState('')

  // UI states
  const [showSeoPanel, setShowSeoPanel] = useState(true)
  const [showCtaPanel, setShowCtaPanel] = useState(true)
  const [showFeaturedPanel, setShowFeaturedPanel] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    await Promise.all([
      fetchAuthors(),
      fetchCategories()
    ])
    setLoading(false)
  }

  async function fetchAuthors() {
    try {
      console.log('Fetching authors...')
      const { data, error } = await supabase
        .from('blog_authors')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      console.log('Authors response:', { data, error })
      
      if (error) {
        console.error('Error fetching authors:', error)
        setError(`Author fetch error: ${error.message}`)
        return
      }
      
      if (data && data.length > 0) {
        console.log('Setting authors:', data)
        setAuthors(data)
        setAuthorId(data[0].id)
      } else {
        console.log('No authors found, creating default...')
        // Create default author
        const { data: newAuthor, error: insertError } = await supabase
          .from('blog_authors')
          .insert([{
            name: 'Habeeb Ismaila',
            role: 'Founder & CEO',
            bio: 'Helping brands build stronger digital systems, better websites, and growth-focused customer experiences.',
            is_active: true,
            display_order: 1
          }])
          .select()
          .single()
        
        if (insertError) {
          console.error('Error creating author:', insertError)
          setError(`Failed to create author: ${insertError.message}`)
        } else if (newAuthor) {
          console.log('Created new author:', newAuthor)
          setAuthors([newAuthor])
          setAuthorId(newAuthor.id)
        }
      }
    } catch (err) {
      console.error('Unexpected error in fetchAuthors:', err)
      setError(`Unexpected error: ${err}`)
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      if (error) {
        console.error('Error fetching categories:', error)
        return
      }
      
      if (data && data.length > 0) {
        setCategories(data)
        const growthCat = data.find(c => c.name.includes('Ecommerce Growth'))
        setCategoryId(growthCat?.id || data[0].id)
      }
    } catch (err) {
      console.error('Unexpected error in fetchCategories:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const finalSlug = slug.trim() || createSlug(title)
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const now = new Date().toISOString()

    if (!authorId || authorId === '') {
      alert('Please select an author')
      setSaving(false)
      return
    }

    const postData = {
      title,
      slug: finalSlug,
      excerpt,
      content,
      featured_image: featuredImage,
      alt_text: altText,
      author_id: authorId,
      category_id: categoryId || null,
      read_time: readTime,
      tags: tagArray,
      cta_text: ctaText,
      cta_link: ctaLink,
      post_type: postType,
      is_featured: isFeatured,
      featured_badge: featuredBadge,
      card_title: cardTitle || title,
      card_description: cardDescription || excerpt?.slice(0, 120),
      status,
      created_at: now,
      updated_at: now,
      seo_title: seoTitle || title,
      seo_description: seoDescription || excerpt?.slice(0, 160),
      focus_keyword: focusKeyword,
      og_title: ogTitle || title,
      og_description: ogDescription || excerpt?.slice(0, 200),
      og_image: ogImage || featuredImage,
      canonical_url: canonicalUrl || null,
      social_caption: socialCaption,
      published_at: status === 'published' ? now : null,
    }

    const { error } = await supabase.from('blog_posts').insert([postData])

    if (error) {
      alert(error.message)
      console.error(error)
    } else {
      router.push('/admin/blog')
    }

    setSaving(false)
  }

  useEffect(() => {
    if (title) {
      if (!seoTitle) setSeoTitle(title)
      if (!ogTitle) setOgTitle(title)
      if (!cardTitle) setCardTitle(title.length > 60 ? title.slice(0, 57) + '...' : title)
    }
  }, [title])

  useEffect(() => {
    if (excerpt) {
      if (!seoDescription) setSeoDescription(excerpt.slice(0, 160))
      if (!ogDescription) setOgDescription(excerpt.slice(0, 200))
      if (!cardDescription) setCardDescription(excerpt.slice(0, 120))
    }
  }, [excerpt])

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'blockquote', 'code-block'],
      ['clean'],
    ],
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
            Create New {postType === 'case_study' ? 'Case Study' : 'Blog Post'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Publish {postType === 'case_study' ? 'client success stories' : 'SEO content and growth insights'}
          </p>
        </div>
        <Link href="/admin/blog" className="text-[var(--accent)] hover:underline">
          ← Back to Blog
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Post Type Selector */}
        <div className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="blog"
              checked={postType === 'blog'}
              onChange={(e) => setPostType(e.target.value)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm font-bold text-[var(--text-primary)]">📝 Blog Post</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="case_study"
              checked={postType === 'case_study'}
              onChange={(e) => setPostType(e.target.value)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm font-bold text-[var(--text-primary)]">📊 Case Study</span>
          </label>
        </div>

        {/* Basic Info Grid */}
        <div className="grid gap-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (!slug) setSlug(createSlug(e.target.value))
              }}
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="e.g., Q3 Growth Readiness: Why Most Ecommerce Stores Struggle to Scale"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(createSlug(e.target.value))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="auto-generated"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">/blog/{slug || '...'}</p>
          </div>

          {/* AUTHOR DROPDOWN - FIXED */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Author *</label>
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              required
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">-- Select Author --</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name} {author.role ? `(${author.role})` : ''}
                </option>
              ))}
            </select>
            {authors.length === 0 && (
              <p className="mt-2 text-xs text-amber-500">
                ⚠️ No authors found. Please refresh the page or check database.
              </p>
            )}
            {authors.length > 0 && (
              <p className="mt-1 text-xs text-green-500">
                ✓ {authors.length} author(s) loaded
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">-- Select Category --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Read Time</label>
            <input
              type="text"
              value={readTime}
              onChange={(e) => setReadTime(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="8 min read"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Status</label>
            <div className="flex gap-4 pt-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm">📝 Draft</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  value="published"
                  checked={status === 'published'}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span className="text-sm">🚀 Published</span>
              </label>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Featured Image</label>
          <ImageUpload
            onUpload={setFeaturedImage}
            currentImage={featuredImage}
            folder="blog"
            label="Upload featured image"
          />
          <div className="mt-3">
            <label className="mb-1 block text-sm font-bold text-[var(--text-primary)]">Alt Text (for SEO)</label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for screen readers and SEO"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Recommended size: 1200 x 630px for optimal sharing</p>
        </div>

        {/* Excerpt */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Excerpt / Summary *</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Brief summary that appears in blog listings and search results..."
          />
          <p className="mt-1 text-right text-xs text-[var(--text-muted)]">{excerpt.length} / 160 recommended</p>
        </div>

        {/* Content Editor */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <label className="mb-3 block text-sm font-bold text-[var(--text-primary)]">Article Content *</label>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            modules={quillModules}
            className="bg-white"
            style={{ minHeight: 400 }}
          />
        </div>

        {/* Tags */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
          <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Ecommerce, Ecommerce Growth, Q3 Growth, Conversion Optimization, Shopify, Customer Experience"
          />
          <p className="mt-1 text-xs text-[var(--text-muted)]">Separate with commas</p>
        </div>

        {/* Featured Card Settings Panel */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => setShowFeaturedPanel(!showFeaturedPanel)}
            className="flex w-full items-center justify-between p-5 text-left"
          >
            <span className="font-bold text-[var(--text-primary)]">⭐ Homepage Featured Card Settings</span>
            <SvgIcon name="chevron-down" size={18} color="var(--accent)" className={`transition ${showFeaturedPanel ? 'rotate-180' : ''}`} />
          </button>
          {showFeaturedPanel && (
            <div className="space-y-4 border-t border-[var(--border)] p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Featured Badge</label>
                  <input
                    type="text"
                    value={featuredBadge}
                    onChange={(e) => setFeaturedBadge(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                    placeholder="Growth Strategy"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Card Title (Short)</label>
                  <input
                    type="text"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                    placeholder={title?.slice(0, 60)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Card Description</label>
                <textarea
                  value={cardDescription}
                  onChange={(e) => setCardDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  placeholder={excerpt?.slice(0, 120)}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-5 w-5 accent-[var(--accent)]"
                />
                <span className="text-sm font-bold text-[var(--text-primary)]">Feature this post on homepage</span>
              </label>
            </div>
          )}
        </div>

        {/* CTA Panel */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => setShowCtaPanel(!showCtaPanel)}
            className="flex w-full items-center justify-between p-5 text-left"
          >
            <span className="font-bold text-[var(--text-primary)]">🎯 Call to Action</span>
            <SvgIcon name="chevron-down" size={18} color="var(--accent)" className={`transition ${showCtaPanel ? 'rotate-180' : ''}`} />
          </button>
          {showCtaPanel && (
            <div className="grid gap-4 border-t border-[var(--border)] p-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">CTA Button Text</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  placeholder="Request a Growth Review"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">CTA Button Link</label>
                <input
                  type="text"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  placeholder="/contact"
                />
              </div>
            </div>
          )}
        </div>

        {/* SEO Panel */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => setShowSeoPanel(!showSeoPanel)}
            className="flex w-full items-center justify-between p-5 text-left"
          >
            <span className="font-bold text-[var(--text-primary)]">🔍 SEO Settings</span>
            <SvgIcon name="chevron-down" size={18} color="var(--accent)" className={`transition ${showSeoPanel ? 'rotate-180' : ''}`} />
          </button>
          {showSeoPanel && (
            <div className="space-y-4 border-t border-[var(--border)] p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{seoTitle.length} / 60 characters</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Focus Keyword</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                    placeholder="e.g., Q3 Growth Readiness"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Meta Description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
                <p className="mt-1 text-right text-xs text-[var(--text-muted)]">{seoDescription.length} / 160 characters</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">OG Title (Social Media)</label>
                  <input
                    type="text"
                    value={ogTitle}
                    onChange={(e) => setOgTitle(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">OG Image</label>
                  <input
                    type="url"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                    placeholder={featuredImage}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">OG Description</label>
                <textarea
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Social Share Caption</label>
                <textarea
                  value={socialCaption}
                  onChange={(e) => setSocialCaption(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  placeholder="More traffic doesn't automatically create more sales..."
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">Used for LinkedIn, Facebook, WhatsApp, and X shares</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Canonical URL</label>
                <input
                  type="url"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  placeholder="https://www.hbeedigitals.com/blog/..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-wrap gap-4 pb-10">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-orange-green px-8 py-3 text-sm font-black text-white transition hover:scale-105 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (status === 'published' ? 'Publish Now' : 'Save as Draft')}
            <SvgIcon name="arrow-diagonal" size={14} color="white" />
          </button>
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-8 py-3 text-sm font-black text-[var(--text-muted)] transition hover:border-[var(--accent)]/25"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}