'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import ImageUpload from '@/components/ImageUpload'

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
})

import 'react-quill/dist/quill.snow.css'

function toArray(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function arrayToText(value: any) {
  if (!value) return ''

  if (Array.isArray(value)) return value.join('\n')

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.join('\n')
    } catch {
      return value
    }
  }

  return ''
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function EditBlogPost() {
  const router = useRouter()
  const params = useParams()

  const id = params?.id as string

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [author, setAuthor] = useState('Hbee Digitals')
  const [readTime, setReadTime] = useState('5 min read')
  const [tags, setTags] = useState('')
  const [ctaText, setCtaText] = useState('Start A Project')
  const [ctaLink, setCtaLink] = useState('/contact')
  const [isFeatured, setIsFeatured] = useState(false)
  const [status, setStatus] = useState('draft')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchPost()
  }, [])

  async function fetchPost() {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data) {
      setTitle(data.title || '')
      setSlug(data.slug || '')
      setExcerpt(data.excerpt || '')
      setContent(data.content || '')
      setFeaturedImage(data.featured_image || '')
      setAuthor(data.author || 'Hbee Digitals')
      setReadTime(data.read_time || '5 min read')
      setTags(arrayToText(data.tags))
      setCtaText(data.cta_text || 'Start A Project')
      setCtaLink(data.cta_link || '/contact')
      setIsFeatured(data.is_featured || false)
      setStatus(data.status || 'draft')
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setSaving(true)
    setMessage('')

    const finalSlug = slug.trim() || createSlug(title)

    const payload = {
      title,
      slug: finalSlug,
      excerpt,
      content,
      featured_image: featuredImage,
      author,
      read_time: readTime,
      tags: toArray(tags),
      cta_text: ctaText,
      cta_link: ctaLink,
      is_featured: isFeatured,
      status,
      updated_at: new Date().toISOString(),
      published_at:
        status === 'published'
          ? new Date().toISOString()
          : null,
    }

    const { error } = await supabase
      .from('blog_posts')
      .update(payload)
      .eq('id', id)

    if (error) {
      setMessage(error.message)
    } else {
      router.push('/admin/blog')
    }

    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this article?')) return

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(error.message)
    } else {
      router.push('/admin/blog')
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-600">
        Loading article...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Edit Blog Article
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Update SEO content, growth insights, and authority articles.
          </p>
        </div>

        <Link
          href="/admin/blog"
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back
        </Link>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-100 p-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Title *"
            value={title}
            onChange={(value) => {
              setTitle(value)

              if (!slug) {
                setSlug(createSlug(value))
              }
            }}
          />

          <Input
            label="Slug"
            value={slug}
            onChange={setSlug}
          />
        </div>

        <Textarea
          label="Excerpt"
          value={excerpt}
          onChange={setExcerpt}
          rows={4}
        />

        <ImageUpload
          onUpload={setFeaturedImage}
          currentImage={featuredImage}
          folder="blog"
          label="Featured Image"
        />

        <div>
          <label className="mb-1 block text-sm font-medium">
            Article Content
          </label>

          <div className="rounded-lg bg-white">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              style={{ minHeight: 300 }}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Author"
            value={author}
            onChange={setAuthor}
          />

          <Input
            label="Read Time"
            value={readTime}
            onChange={setReadTime}
          />

          <div>
            <label className="mb-1 block text-sm font-medium">
              Status
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        </div>

        <Textarea
          label="Tags"
          value={tags}
          onChange={setTags}
          rows={4}
          placeholder={'One per line\nShopify\nConversion Optimization'}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="CTA Text"
            value={ctaText}
            onChange={setCtaText}
          />

          <Input
            label="CTA Link"
            value={ctaLink}
            onChange={setCtaLink}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) =>
              setIsFeatured(e.target.checked)
            }
          />

          <span className="text-sm">
            Featured article
          </span>
        </label>

        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg px-5 py-2 text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {saving ? 'Updating...' : 'Update Article'}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-5 py-2 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border p-2"
      />
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border p-2"
      />
    </div>
  )
}