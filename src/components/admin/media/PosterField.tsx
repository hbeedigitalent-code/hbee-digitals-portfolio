'use client'

import { useState } from 'react'
import type { MediaAsset } from '@/lib/media/media-types'
import MediaPicker from './MediaPicker'

const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'

export interface PosterFieldProps {
  poster: MediaAsset | null
  required?: boolean
  error?: string
  suggestedTitle?: string
  disabled?: boolean
  onChange: (poster: MediaAsset | null) => void
}

/** A video's poster: an ordinary Media Library image, chosen (or uploaded) through the existing image picker. */
export default function PosterField({ poster, required = false, error, suggestedTitle = '', disabled = false, onChange }: PosterFieldProps) {
  const [open, setOpen] = useState(false)
  return <div className="space-y-2">
    <p className="text-sm text-[var(--text-primary)]">Poster image{required ? ' *' : ' (recommended)'}</p>
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        {poster
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={poster.public_url} alt={`Poster: ${poster.title}`} className="max-h-full max-w-full object-contain" />
          : <span className="text-xs text-gray-500">No poster</span>}
      </span>
      <button type="button" className={button} disabled={disabled} onClick={() => setOpen(true)}>{poster ? 'Change poster' : 'Choose poster'}</button>
      {poster && <button type="button" className={button} disabled={disabled} onClick={() => onChange(null)}>Clear poster</button>}
    </div>
    {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={onChange} selectedId={poster?.id ?? null} uploadCategory="general" suggestedTitle={suggestedTitle} heading="Choose a poster image" />
  </div>
}
