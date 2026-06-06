'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hbeedigitals.com'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toAbsoluteUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${siteUrl}${url}`
  return url
}

function estimateReadTime(html: string) {
  const text = html.replace(/<[^>]+>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 220))} min read`
}

export default function NewBlogPostPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [featuredImageAlt, setFeaturedImageAlt] = useState('')
  const [author, setAuthor] = useState('Habeeb Ismaila')
  const [tags, setTags] = useState('Ecommerce, Growth Strategy, Hbee Digitals')
  const [status, setStatus] = useState('draft')
  const [isFeatured, setIsFeatured] = useState(false)
  const [featuredBadge, setFeaturedBadge] = useState('Featured Insight')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [ogTitle, setOgTitle] = useState('')
  const [ogDescription, setOgDescription] = useState('')

  const finalSlug = useMemo(() => slug || slugify(title), [slug, title])
  const finalFeaturedImage = useMemo(() => toAbsoluteUrl(featuredImage), [featuredImage])
  const readTime = useMemo(() => estimateReadTime(content), [content])

  async function savePost() {
    if (!title.trim() || !finalSlug || !content.trim()) {
      alert('Title, slug, and content are required.')
      return
    }

    setSaving(true)

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const postData = {
      title,
      slug: finalSlug,
      excerpt,
      content,
      featured_image: finalFeaturedImage || null,
      featured_image_alt: featuredImageAlt,
      alt_text: featuredImageAlt,
      author,
      tags: tagArray,
      status,
      post_type: 'blog',
      is_featured: isFeatured,
      featured_badge: featuredBadge,
      read_time: readTime,
      published_at: status === 'published' ? new Date().toISOString() : null,

      seo_title: seoTitle || title,
      seo_description: seoDescription || excerpt.slice(0, 160),
      focus_keyword: focusKeyword,

      og_title: ogTitle || seoTitle || title,
      og_description: ogDescription || seoDescription || excerpt.slice(0, 200),
      og_image: finalFeaturedImage || null,
      canonical_url: `${siteUrl}/blog/${finalSlug}`,
    }

    const { error } = await supabase.from('blog_posts').insert(postData)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/admin/blog')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">New Blog Post</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Featured image automatically becomes the OG/social sharing image.
          </p>
        </div>

        <Link href="/admin/blog" className="font-bold text-[var(--accent)]">
          Back to Blog
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card title="Main Content">
            <Input label="Title" value={title} setValue={setTitle} />
            <Input label="Slug" value={finalSlug} setValue={setSlug} />
            <Textarea label="Excerpt / Summary" value={excerpt} setValue={setExcerpt} rows={4} />
            <Textarea label="HTML Content" value={content} setValue={setContent} rows={24} mono />
          </Card>

          <Card title="Image & Metadata">
            <Input label="Featured Image URL" value={featuredImage} setValue={setFeaturedImage} />
            <Input label="Featured Image Alt Text" value={featuredImageAlt} setValue={setFeaturedImageAlt} />
            <Input label="Author" value={author} setValue={setAuthor} />
            <Input label="Tags comma separated" value={tags} setValue={setTags} />
          </Card>

          <Card title="SEO">
            <Input label="SEO Title" value={seoTitle} setValue={setSeoTitle} />
            <Textarea label="Meta Description" value={seoDescription} setValue={setSeoDescription} rows={3} />
            <Input label="Focus Keyword" value={focusKeyword} setValue={setFocusKeyword} />
            <Input label="OG Title - optional" value={ogTitle} setValue={setOgTitle} />
            <Textarea label="OG Description - optional" value={ogDescription} setValue={setOgDescription} rows={3} />

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm text-[var(--text-muted)]">
              OG Image is auto-generated from Featured Image:
              <br />
              <span className="font-bold text-[var(--accent)] break-all">
                {finalFeaturedImage || 'Add featured image first'}
              </span>
            </div>
          </Card>

          <button
            onClick={savePost}
            disabled={saving}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[#07111F]"
          >
            {saving ? 'Saving...' : 'Save Blog Post'}
          </button>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <Card title="Publish Settings">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>

            <label className="flex items-center gap-3 text-sm font-bold text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Featured article
            </label>

            <Input label="Featured Badge" value={featuredBadge} setValue={setFeaturedBadge} />

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Read Time
              </p>
              <p className="mt-2 text-xl font-black text-[var(--text-primary)]">{readTime}</p>
            </div>
          </Card>

          <Card title="Preview">
            {finalFeaturedImage && (
              <img src={finalFeaturedImage} alt="" className="mb-4 aspect-[1200/630] w-full rounded-xl object-cover" />
            )}

            <h2 className="text-xl font-black text-[var(--text-primary)]">{title || 'Blog title preview'}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {excerpt || 'Blog excerpt preview will appear here.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
      {children}
    </div>
  )
}

function Input({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
    </label>
  )
}

function Textarea({
  label,
  value,
  setValue,
  rows,
  mono,
}: {
  label: string
  value: string
  setValue: (v: string) => void
  rows: number
  mono?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] ${
          mono ? 'font-mono text-sm' : ''
        }`}
      />
    </label>
  )
}