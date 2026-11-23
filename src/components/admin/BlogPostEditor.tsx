'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { estimateReadTime, insightCanonical, insightHref, insightTags, SITE_URL, validReadTime } from '@/lib/blog-utils'
import { insightPublicationLabel, revalidateInsightPublicPages, writeInsightPost } from '@/lib/admin/insights-editor'
import { InsightArticleBody } from '@/components/site/insights/InsightArticleBody'
import MediaImageField from '@/components/admin/media/MediaImageField'
import MediaPicker from '@/components/admin/media/MediaPicker'
import { ArticleMediaError, buildArticleFigureHtml, insertHtmlBlock } from '@/lib/admin/article-media'
import type { MediaAsset } from '@/lib/media/media-types'
import type { InsightDetail } from '@/lib/site/insights-data'
import '@/styles/site-tokens.css'

type InitialPost = {
  id?: string
  title?: string
  slug?: string
  excerpt?: string
  content?: string
  featured_image?: string
  featured_image_alt?: string
  alt_text?: string
  author?: string
  tags?: string[]
  status?: string
  is_featured?: boolean
  seo_title?: string
  seo_description?: string
  focus_keyword?: string
  og_title?: string
  og_description?: string
  og_image?: string
  canonical_url?: string
  read_time?: string
  published_at?: string | null
}

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
  if (url.startsWith('/')) return `${SITE_URL}${url}`
  return url
}

export default function BlogPostEditor({
  mode,
  initialPost,
}: {
  mode: 'new' | 'edit'
  initialPost?: InitialPost
}) {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [preview, setPreview] = useState<InsightDetail | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const savePending = useRef(false)
  const contentRef = useRef<HTMLTextAreaElement | null>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)
  const pendingCaret = useRef<number | null>(null)
  const [inlinePicker, setInlinePicker] = useState(false)
  const [inlineAsset, setInlineAsset] = useState<MediaAsset | null>(null)
  const [inlineAlt, setInlineAlt] = useState('')
  const [inlineCaption, setInlineCaption] = useState('')
  const [inlineDecorative, setInlineDecorative] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [inlineNote, setInlineNote] = useState('')
  /** Alt text the Media Library holds for the featured image, offered (never forced) when the article's alt differs. */
  const [libraryAlt, setLibraryAlt] = useState('')

  const [title, setTitle] = useState(initialPost?.title || '')
  const [slug, setSlug] = useState(initialPost?.slug || '')
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '')
  const [content, setContent] = useState(initialPost?.content || '')
  const [featuredImage, setFeaturedImage] = useState(initialPost?.featured_image || '')
  const [featuredImageAlt, setFeaturedImageAlt] = useState(
    initialPost?.featured_image_alt ?? initialPost?.alt_text ?? ''
  )
  const [author, setAuthor] = useState(initialPost ? initialPost.author || '' : 'Habeeb Ismaila')
  const [tags, setTags] = useState(insightTags(initialPost?.tags).join(', '))
  const [status, setStatus] = useState(initialPost?.status || 'draft')
  const [isFeatured, setIsFeatured] = useState(Boolean(initialPost?.is_featured))

  const [seoTitle, setSeoTitle] = useState(initialPost?.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(initialPost?.seo_description || '')
  const [focusKeyword, setFocusKeyword] = useState(initialPost?.focus_keyword || '')
  const [ogTitle, setOgTitle] = useState(initialPost?.og_title || '')
  const [ogDescription, setOgDescription] = useState(initialPost?.og_description || '')
  const [ogImage, setOgImage] = useState(initialPost?.og_image || '')
  const [canonicalUrl, setCanonicalUrl] = useState(initialPost?.canonical_url ? insightCanonical(initialPost.slug || '', initialPost.canonical_url) : '')

  const [readTimeInput, setReadTimeInput] = useState(initialPost?.read_time || '')

  const finalSlug = useMemo(() => slug || slugify(title), [slug, title])
  const finalFeaturedImage = useMemo(() => toAbsoluteUrl(featuredImage), [featuredImage])
  const readTime = useMemo(() => estimateReadTime(content), [content])
  const finalReadTime = validReadTime(readTimeInput) || readTime

  function currentArticle() {
    return { title, excerpt, content, featured_image: finalFeaturedImage || null,
      featured_image_alt: featuredImageAlt, author, tags: insightTags(tags), read_time: finalReadTime,
      published_at: initialPost?.published_at || null }
  }

  async function previewArticle() {
    setPreviewing(true); setErrorMessage('')
    try {
      const response = await fetch('/api/admin/insights/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentArticle()), cache: 'no-store' })
      const detail = await response.json()
      if (!response.ok) throw new Error(detail.error || 'Preview failed.')
      if (!detail || typeof detail.html !== 'string') throw new Error('Invalid preview response.')
      setPreview(detail)
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Preview failed.') }
    finally { setPreviewing(false) }
  }

  function insertSnippet(snippet: string) {
    setContent((prev) => `${prev}\n\n${snippet}`)
  }

  /** Featured image chosen from / uploaded into the Media Library. Existing article alt text is never overwritten silently. */
  function changeFeaturedImage(url: string, asset?: MediaAsset) {
    setFeaturedImage(url)
    if (!asset) { setLibraryAlt(''); return }
    const assetAlt = asset.is_decorative ? '' : asset.alt_text
    if (!featuredImageAlt.trim()) { setFeaturedImageAlt(assetAlt); setLibraryAlt('') }
    else setLibraryAlt(assetAlt && assetAlt !== featuredImageAlt ? assetAlt : '')
  }

  function rememberSelection() {
    const el = contentRef.current
    if (el) selectionRef.current = { start: el.selectionStart, end: el.selectionEnd }
  }

  function chooseInlineAsset(asset: MediaAsset) {
    setInlineAsset(asset); setInlineAlt(asset.is_decorative ? '' : asset.alt_text); setInlineCaption(asset.caption || '')
    setInlineDecorative(asset.is_decorative); setInlineError(''); setInlineNote('')
  }

  function insertInlineImage() {
    if (!inlineAsset) return
    try {
      const html = buildArticleFigureHtml({ src: inlineAsset.public_url, alt: inlineAlt, decorative: inlineDecorative, caption: inlineCaption, width: inlineAsset.width, height: inlineAsset.height })
      const result = insertHtmlBlock(content, html, selectionRef.current)
      pendingCaret.current = result.caret
      setContent(result.content)
      setInlineNote(result.atCursor ? 'Image inserted at the cursor position. Refresh the preview to see it.' : 'Image inserted at the end of the article (click inside the text first to choose where). Refresh the preview to see it.')
      setInlineAsset(null); setInlineError('')
    } catch (error) { setInlineError(error instanceof ArticleMediaError ? error.message : 'The image could not be inserted.') }
  }

  // Put the cursor after an inserted block once React has rendered the new text.
  useEffect(() => {
    const caret = pendingCaret.current
    if (caret === null) return
    pendingCaret.current = null
    const el = contentRef.current
    if (el) { el.focus(); el.setSelectionRange(caret, caret); selectionRef.current = { start: caret, end: caret } }
  }, [content])

  async function savePost() {
    if (savePending.current) return
    if (mode === 'edit' && !initialPost?.id) { setErrorMessage('Reload the article before saving.'); return }
    if (!title.trim() || !finalSlug || !content.trim()) {
      setErrorMessage('Title, slug, and content are required.')
      return
    }
    if (!/^[a-z0-9_]+(?:-[a-z0-9_]+)*$/.test(finalSlug)) { setErrorMessage('Use a lowercase URL slug with letters, numbers, underscores and single hyphens.'); return }
    if (readTimeInput.trim() && !validReadTime(readTimeInput)) { setErrorMessage('Read time must be a positive number of minutes, such as “5 min read”.'); return }
    try { if (canonicalUrl.trim() && !['https:', 'http:'].includes(new URL(canonicalUrl, SITE_URL).protocol)) throw new Error() }
    catch { setErrorMessage('Canonical URL must be a valid HTTP(S) URL or local path.'); return }

    savePending.current = true
    setSaving(true)
    setErrorMessage('')

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const payload = {
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
      // Preserve valid stored reading-time strings; estimate only when blank.
      read_time: readTimeInput.trim() || readTime,

      seo_title: seoTitle,
      seo_description: seoDescription,
      focus_keyword: focusKeyword,

      og_title: ogTitle,
      og_description: ogDescription,
      og_image: ogImage.trim() || null,
      canonical_url: insightCanonical(finalSlug, canonicalUrl),
      updated_at: new Date().toISOString(),
    }

    try {
      await writeInsightPost(supabase, mode === 'edit' ? initialPost?.id : undefined, payload, status)
      try {
        await revalidateInsightPublicPages()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Article saved, but public Insights pages could not be refreshed.')
        return
      }
      router.push('/admin/blog')
    } catch (error) {
      setErrorMessage(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Article save failed.')
    } finally { setSaving(false); savePending.current = false }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {errorMessage && <p role="alert" className="rounded-xl border border-red-500/30 p-4 text-sm text-red-500">{errorMessage}</p>}
      <fieldset disabled={saving} className="grid min-w-0 gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card title="Main Content">
            <Input label="Title" value={title} setValue={setTitle} />
            <Input label="Slug" value={finalSlug} setValue={setSlug} />
            <p className="break-all text-xs text-[var(--text-muted)]">Public URL: {SITE_URL}{insightHref(finalSlug || 'your-slug')}</p>
            <Textarea label="Excerpt" value={excerpt} setValue={setExcerpt} rows={4} />

            <div>
              <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                Content Tools
              </span>

              <div className="mb-3 flex flex-wrap gap-2">
                <ToolButton onClick={() => insertSnippet('<h2>New section heading</h2>')}>H2</ToolButton>
                <ToolButton onClick={() => insertSnippet('<h3>Subheading</h3>')}>H3</ToolButton>
                <ToolButton onClick={() => insertSnippet('<p>Write your paragraph here.</p>')}>Paragraph</ToolButton>
                <ToolButton onClick={() => insertSnippet('<ul>\n  <li>First point</li>\n  <li>Second point</li>\n</ul>')}>List</ToolButton>
                <ToolButton onClick={() => insertSnippet('<blockquote>Important insight or quote here.</blockquote>')}>Quote</ToolButton>
                <ToolButton onClick={() => insertSnippet('<a href="https://hbeedigitals.com/growth-review" target="_blank" rel="noopener">Request a Growth Review</a>')}>Link</ToolButton>
                <ToolButton onClick={() => { rememberSelection(); setInlineNote(''); setInlinePicker(true) }}>Insert image</ToolButton>
              </div>

              {inlineAsset && <div className="mb-3 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4">
                <p className="text-sm font-bold text-[var(--text-primary)]">Insert “{inlineAsset.title}” into the article</p>
                <img src={inlineAsset.public_url} alt="" className="max-h-32 rounded-lg bg-white object-contain p-1" />
                <Input label="Alt text (describes the image)" value={inlineDecorative ? '' : inlineAlt} setValue={setInlineAlt} />
                <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" checked={inlineDecorative} onChange={(e) => setInlineDecorative(e.target.checked)} />Decorative image (no alt text needed)</label>
                <Input label="Caption (optional)" value={inlineCaption} setValue={setInlineCaption} />
                {inlineError && <p role="alert" className="text-sm text-red-500">{inlineError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={insertInlineImage} className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-black text-[#07111F]">Insert image</button>
                  <button type="button" onClick={() => { setInlineAsset(null); setInlineError('') }} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">Cancel</button>
                </div>
              </div>}
              {inlineNote && <p role="status" className="mb-3 text-sm text-[var(--accent)]">{inlineNote}</p>}
              <MediaPicker open={inlinePicker} onClose={() => setInlinePicker(false)} heading="Insert an image into the article" initialCategory="insight_image" uploadCategory="insight_image" onSelect={chooseInlineAsset} />

              <Textarea label="HTML Content" value={content} setValue={setContent} rows={24} mono textareaRef={contentRef} onSelectionChange={rememberSelection} />
            </div>
          </Card>

          <Card title="Image & Metadata">
            <MediaImageField label="Featured image" urlLabel="Featured Image URL" value={featuredImage} onChange={changeFeaturedImage}
              pickerCategory="insight_image" uploadCategory="insight_image" suggestedTitle={title}
              hint="Choose an image from the Media Library or upload a new one there. No URL copying needed." />
            <Input label="Featured Image Alt Text" value={featuredImageAlt} setValue={setFeaturedImageAlt} />
            {libraryAlt && <p className="text-xs text-[var(--text-muted)]">The Media Library describes this image as “{libraryAlt}”. Your article's alt text was kept. <button type="button" className="font-bold text-[var(--accent)] underline" onClick={() => { setFeaturedImageAlt(libraryAlt); setLibraryAlt('') }}>Use the library alt text</button></p>}
            {finalFeaturedImage && !featuredImageAlt.trim() && <p role="status" className="text-xs text-amber-600">Add alt text so the featured image is described for people who cannot see it.</p>}
            <Input label="Author" value={author} setValue={setAuthor} />
            <Input label="Topics / tags (comma separated)" value={tags} setValue={setTags} />
            <p className="text-xs text-[var(--text-muted)]">Public topics come from these tags. Legacy blog categories do not control Insights.</p>
          </Card>

          <Card title="SEO & Social Sharing">
            <Input label="SEO Title" value={seoTitle} setValue={setSeoTitle} />
            <Textarea label="Meta Description" value={seoDescription} setValue={setSeoDescription} rows={3} />
            <Input label="Focus Keyword" value={focusKeyword} setValue={setFocusKeyword} />
            <Input label="OG Title" value={ogTitle} setValue={setOgTitle} />
            <Textarea label="OG Description" value={ogDescription} setValue={setOgDescription} rows={3} />
            <MediaImageField label="Social share (OG) image" urlLabel="OG Image URL" value={ogImage} onChange={(url) => setOgImage(url)}
              pickerCategory="graphic" uploadCategory="graphic" suggestedTitle={title ? `${title} social image` : ''}
              hint="Optional. Leave empty to use the featured image. Best at 1200 × 630 pixels." />
            <Input
              label="Canonical URL"
              value={canonicalUrl}
              setValue={setCanonicalUrl}
              placeholder={`${SITE_URL}/insights/${finalSlug || 'your-slug'}`}
            />

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4 text-sm text-[var(--text-muted)]">
              Leave OG Image and Canonical URL empty to auto-generate them from the
              featured image and slug:
              <br />
              <span className="break-all font-bold text-[var(--accent)]">
                {ogImage.trim() || finalFeaturedImage || 'Upload or paste featured image first'}
              </span>
              <p className="mt-2 break-all">Public canonical: {insightCanonical(finalSlug || 'your-slug', canonicalUrl)}</p>
              <p className="mt-2">SEO title preview: {seoTitle || ogTitle || title}</p>
              <p className="mt-2">Description preview: {seoDescription || ogDescription || excerpt.slice(0, 160)}</p>
            </div>
          </Card>

          <button
            onClick={savePost}
            disabled={saving}
            className="rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-black text-[#07111F]"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Update Insight' : 'Save Insight'}
          </button>
        </div>

        <div className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
          <Card title="Publish Settings">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                Status
              </span>

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

            <p className="text-sm text-[var(--text-muted)]">Publication date: {insightPublicationLabel(initialPost?.published_at)}. First publish sets it; edits, unpublishing and republishing preserve it. Future dates do not schedule publication.</p>

            <Input
              label="Read Time"
              value={readTimeInput}
              setValue={setReadTimeInput}
              placeholder={`Auto: ${readTime}`}
            />
            <p className="text-xs text-[var(--text-muted)]">
              Leave empty to use the shared 200 words/minute estimate ({readTime}).
            </p>
          </Card>

          <Card title="Preview">
            {finalFeaturedImage && (
              <img
                src={finalFeaturedImage}
                alt={featuredImageAlt}
                className="mb-4 aspect-[1200/630] w-full rounded-xl object-cover"
              />
            )}

            <h2 className="text-xl font-black text-[var(--text-primary)]">
              {title || 'Blog title preview'}
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {excerpt || 'Blog excerpt preview will appear here.'}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{author} · {finalReadTime}</p>
            <button type="button" onClick={previewArticle} disabled={previewing} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text-primary)]">{previewing ? 'Preparing preview…' : 'Refresh sanitized preview'}</button>
          </Card>
        </div>
      </fieldset>
      {preview && <section aria-label="Sanitized article preview" data-surface="site" className="relative isolate max-h-[70vh] overflow-auto rounded-xl bg-white p-6 [contain:content]">
        <p className="mb-4 text-sm text-hb-fg-body">Preview snapshot — refresh after editing. The public article body styles and sanitizer are reused; the full page layout is unchanged.</p>
        <h2 id="insight-preview-title" className="font-hb-display text-2xl font-bold text-hb-fg">{preview.title}</h2>
        {preview.excerpt && <p className="my-4 text-hb-fg-body">{preview.excerpt}</p>}
        {preview.image && <img src={preview.image.src} alt={preview.image.alt} className="my-5 max-h-80 w-full object-contain" />}
        <InsightArticleBody html={preview.html} labelledBy="insight-preview-title" />
      </section>}
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

function Input({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string
  value: string
  setValue: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
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
  textareaRef,
  onSelectionChange,
}: {
  label: string
  value: string
  setValue: (value: string) => void
  rows: number
  mono?: boolean
  textareaRef?: React.Ref<HTMLTextAreaElement>
  /** Fired on blur / selection / click / key-up so the caller can remember the cursor. */
  onSelectionChange?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">{label}</span>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onSelectionChange}
        onSelect={onSelectionChange}
        onClick={onSelectionChange}
        onKeyUp={onSelectionChange}
        rows={rows}
        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)] ${
          mono ? 'font-mono text-sm' : ''
        }`}
      />
    </label>
  )
}

function ToolButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-black text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {children}
    </button>
  )
}
