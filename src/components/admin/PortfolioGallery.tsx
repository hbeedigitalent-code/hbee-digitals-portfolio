'use client'

import { useRef, useState } from 'react'
import ImageUpload from '@/components/ImageUpload'
import { moveGalleryImage, validPortfolioImage } from '@/lib/admin/portfolio-editor'

export default function PortfolioGallery({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [uploadKey, setUploadKey] = useState(0)
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">Gallery order is saved as shown. The public page removes duplicates and images already used as the cover or before/after pair. Removing an entry does not delete its stored file.</p>
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
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <label htmlFor="gallery-new-url" className="block text-sm font-bold text-[var(--text-secondary)]">Add image URL</label>
          <input id="gallery-new-url" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(url) } }} aria-describedby={error ? 'gallery-url-error' : undefined} aria-invalid={Boolean(error)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]" />
          {error && <p id="gallery-url-error" role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
          <button type="button" onClick={() => addImage(url)} className={`${action} mt-3`}>Add image</button>
        </div>
        <ImageUpload key={uploadKey} label="Upload gallery image" folder="portfolio" contain onUpload={(value) => { if (value) { addImage(value); setUploadKey((key) => key + 1) } }} />
      </div>
    </div>
  )
}
