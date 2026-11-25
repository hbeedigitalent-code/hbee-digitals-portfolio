'use client'

import { useRef, useState } from 'react'
import MediaPicker from '@/components/admin/media/MediaPicker'
import type { MediaAsset } from '@/lib/media/media-types'
import { moveGalleryImage, validPortfolioImage } from '@/lib/admin/portfolio-editor'

export default function PortfolioGallery({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const currentImages = useRef(images)
  currentImages.current = images
  const action = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] disabled:opacity-40'

  function addImage(value: string) {
    const next = value.trim()
    if (!validPortfolioImage(next)) { setError('Use an HTTPS image URL or local /path.'); return }
    onChange([...currentImages.current, next])
    setUrl('')
    setError('')
  }

  /** Library images are added by URL, exactly like the existing entries, so stored galleries keep the same shape. */
  function addAsset(asset: MediaAsset) {
    if (currentImages.current.includes(asset.public_url)) { setNotice(`“${asset.title}” is already in this gallery.`); return }
    onChange([...currentImages.current, asset.public_url])
    setNotice(`Added “${asset.title}”.`)
  }

  /** "Add selected": several library images in one change, skipping any already in the gallery. */
  function addAssets(assets: MediaAsset[]) {
    if (assets.length === 1) { addAsset(assets[0]); return }
    const fresh = assets.map((asset) => asset.public_url).filter((url) => !currentImages.current.includes(url))
    if (fresh.length) onChange([...currentImages.current, ...fresh])
    const skipped = assets.length - fresh.length
    setNotice(`Added ${fresh.length} image${fresh.length === 1 ? '' : 's'}.${skipped ? ` ${skipped} already in this gallery.` : ''}`)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">Gallery order is saved as shown. Per-image alt text is not stored for gallery images yet; the Media Library keeps each image's description. The public page removes duplicates and images already used as the cover or before/after pair. Removing an entry does not delete its stored file.</p>
      <ol className="space-y-3">
        {images.map((image, index) => (
          <li key={index} className="rounded-xl border border-[var(--border)] p-4">
            <div className="flex flex-wrap items-start gap-4">
              {validPortfolioImage(image) && <img src={image} alt={`Gallery image ${index + 1}`} className="h-24 w-32 rounded-lg bg-[var(--bg-section)] object-contain" />}
              <div className="min-w-0 flex-1 basis-48">
                <label className="block text-sm font-bold text-[var(--text-secondary)]">Image {index + 1} URL
                  <input value={image} onChange={(e) => onChange(images.map((value, i) => i === index ? e.target.value : value))} aria-invalid={!validPortfolioImage(image)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]" />
                </label>
                {!validPortfolioImage(image) && <p className="mt-1 text-xs text-red-500">Use an HTTPS image URL or local /path.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={index === 0} aria-label={`Move image ${index + 1} up`} onClick={() => onChange(moveGalleryImage(images, index, -1))} className={action}>Move up</button>
                  <button type="button" disabled={index === images.length - 1} aria-label={`Move image ${index + 1} down`} onClick={() => onChange(moveGalleryImage(images, index, 1))} className={action}>Move down</button>
                  <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => onChange(images.filter((_, i) => i !== index))} className={action}>Remove</button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {!images.length && <p className="text-sm text-[var(--text-muted)]">No gallery images yet.</p>}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setNotice(''); setPickerOpen(true) }} className={action}>Add from Media Library</button>
          {notice && <p role="status" className="text-sm text-[var(--accent)]">{notice}</p>}
        </div>
        <p className="text-xs text-[var(--text-muted)]">Pick several images in one go, or upload new ones into the library. Removing an image from the gallery never deletes the library asset or its file.</p>
        <details className="rounded-lg border border-[var(--border)] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--text-secondary)]">Advanced: add by image URL</summary>
          <div className="mt-3">
            <div>
              <label htmlFor="gallery-new-url" className="block text-sm font-bold text-[var(--text-secondary)]">Add image URL</label>
              <input id="gallery-new-url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(url) } }} aria-describedby={error ? 'gallery-url-error' : undefined} aria-invalid={Boolean(error)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]" />
              {error && <p id="gallery-url-error" role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
              <button type="button" onClick={() => addImage(url)} className={`${action} mt-3`}>Add image</button>
            </div>
          </div>
        </details>
        <MediaPicker open={pickerOpen} keepOpen multiple onClose={() => setPickerOpen(false)} heading="Add gallery images" initialCategory="project_image" uploadCategory="project_image" onSelect={addAsset} onSelectMany={addAssets} />
      </div>
    </div>
  )
}
