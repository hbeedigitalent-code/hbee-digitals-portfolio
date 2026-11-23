'use client'

import { useState, type ReactNode } from 'react'
import MediaPicker from './MediaPicker'
import type { ImageCategory, MediaAsset } from '@/lib/media/media-types'

const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'
const inputClass = 'mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2 text-sm text-[var(--text-primary)]'

export interface MediaImageFieldProps {
  /** The stored image URL (existing raw URLs keep working untouched). */
  value: string
  /** Called with the new URL; `asset` is present when it came from the Media Library, absent for a manually typed URL or a clear. */
  onChange: (url: string, asset?: MediaAsset) => void
  label: string
  /** What the manual URL box is called, e.g. "Main / cover image URL". */
  urlLabel?: string
  /** Whether `value` is something we can show as an image preview. */
  isPreviewable?: (value: string) => boolean
  pickerCategory?: ImageCategory | ''
  uploadCategory?: ImageCategory
  suggestedTitle?: string
  disabled?: boolean
  hint?: string
  /** Allow removing the reference (never deletes the file). */
  clearable?: boolean
  previewClassName?: string
  /** Replaces the built-in URL box inside "Advanced" (e.g. an existing validated form field). */
  children?: ReactNode
}

/**
 * One image reference: preview, choose / replace from the Media Library (or upload a new one into it), remove the
 * reference, and the legacy URL box under "Advanced". Removing never deletes the stored file or the library asset.
 */
export default function MediaImageField({
  value, onChange, label, urlLabel = 'Image URL', isPreviewable = (v) => /^(https:\/\/|\/(?!\/))/.test(v), pickerCategory = '', uploadCategory = 'general',
  suggestedTitle = '', disabled = false, hint, clearable = true, previewClassName = 'max-h-full max-w-full object-contain', children,
}: MediaImageFieldProps) {
  const [open, setOpen] = useState(false)
  const previewable = !!value && isPreviewable(value)
  return <div className="space-y-3">
    <p className="text-sm font-bold text-[var(--text-primary)]">{label}</p>
    <div className="flex h-36 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-2">
      {previewable
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={value} alt={`Selected image: ${label}`} className={previewClassName} />
        : <span className="text-xs text-[var(--text-muted)]">{value ? 'This URL cannot be previewed.' : 'No image selected'}</span>}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={disabled} onClick={() => setOpen(true)}>{value ? 'Replace image' : 'Choose from Media Library'}</button>
      {clearable && value ? <button type="button" className={button} disabled={disabled} onClick={() => onChange('')}>Remove image</button> : null}
    </div>
    {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    <details className="rounded-lg border border-[var(--border)] p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Advanced: {urlLabel}</summary>
      {children ?? <label className="mt-3 block text-sm text-[var(--text-secondary)]">{urlLabel}<input className={inputClass} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>}
      <p className="mt-2 text-xs text-[var(--text-muted)]">Existing images keep working through their URL. Removing an image here never deletes the file.</p>
    </details>
    <MediaPicker open={open} onClose={() => setOpen(false)} heading={`Choose: ${label}`} initialCategory={pickerCategory} uploadCategory={uploadCategory}
      suggestedTitle={suggestedTitle} selectedUrl={value || null} onSelect={(asset) => onChange(asset.public_url, asset)} />
  </div>
}
