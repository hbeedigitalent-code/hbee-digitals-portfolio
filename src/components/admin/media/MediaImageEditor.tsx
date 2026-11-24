'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactCrop, { type PercentCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  analyseImage, clampRect, decodeForEdit, editedFileName, editedMime, renderCrop,
  type DecodedImage, type ImageAnalysis, type PixelRect,
} from '@/lib/media/media-edit'

const button = 'rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40'
const primary = 'rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--btn-primary-text)] disabled:opacity-50'
/** Neutral checkerboard so transparent margins are visible (a white tile would hide white-on-transparent marks). */
const checker = {
  backgroundColor: '#e9edf2',
  backgroundImage: 'linear-gradient(45deg,#cfd6df 25%,transparent 25%,transparent 75%,#cfd6df 75%),linear-gradient(45deg,#cfd6df 25%,transparent 25%,transparent 75%,#cfd6df 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 8px 8px',
} as const

export interface MediaImageEditorProps {
  file: File
  /** The validated MIME of the picked file (decides PNG vs JPEG output). */
  mime: string
  /** Receives a NEW local File. The caller must run it through the normal validation + checksum before upload. */
  onApply: (edited: File) => void
  onCancel: () => void
}

const toPercent = (rect: PixelRect, width: number, height: number): PercentCrop => ({
  unit: '%', x: (rect.left / width) * 100, y: (rect.top / height) * 100, width: (rect.width / width) * 100, height: (rect.height / height) * 100,
})
const toPixels = (crop: PercentCrop, width: number, height: number): PixelRect =>
  clampRect({ left: (crop.x / 100) * width, top: (crop.y / 100) * height, width: (crop.width / 100) * width, height: (crop.height / 100) * height }, width, height)

/**
 * Trim / crop one picked image before it is uploaded. Free aspect ratio, touch and keyboard supported (react-image-crop),
 * auto-trim of transparent margins, an opt-in solid-background trim, before / after preview, Reset / Apply / Cancel.
 * No filters, colour edits, text or rotation. Applying produces a new local File only; nothing is uploaded or deleted here.
 */
export default function MediaImageEditor({ file, mime, onApply, onCancel }: MediaImageEditorProps) {
  const decoded = useRef<DecodedImage | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null)
  const [crop, setCrop] = useState<PercentCrop | undefined>()
  const [committed, setCommitted] = useState<PixelRect | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let live = true
    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    decodeForEdit(file)
      .then((image) => {
        if (!live) { image.close(); return }
        decoded.current = image
        setAnalysis(analyseImage(image))
      })
      .catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : 'This image could not be opened for editing.') })
    return () => { live = false; URL.revokeObjectURL(url); decoded.current?.close(); decoded.current = null }
  }, [file])

  // Result preview for the committed (finished) selection, so dragging stays smooth.
  useEffect(() => {
    const image = decoded.current
    if (!image || !committed) { setPreviewUrl(''); return }
    let live = true
    let url = ''
    renderCrop(image, committed, editedMime(mime)).then((blob) => {
      if (!live) return
      url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    }).catch(() => { if (live) setPreviewUrl('') })
    return () => { live = false; if (url) URL.revokeObjectURL(url) }
  }, [committed, mime, analysis])

  const select = useCallback((rect: PixelRect, message: string) => {
    if (!analysis) return
    setCrop(toPercent(rect, analysis.width, analysis.height))
    setCommitted(rect)
    setNote(message)
  }, [analysis])

  const reset = () => { setCrop(undefined); setCommitted(null); setNote(''); setError('') }

  async function apply() {
    const image = decoded.current
    if (!image || !committed || applying) return
    setApplying(true); setError('')
    try {
      const out = editedMime(mime)
      const blob = await renderCrop(image, committed, out)
      onApply(new File([blob], editedFileName(file.name, out), { type: out }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The edited image could not be created.')
      setApplying(false)
    }
  }

  const result = useMemo(() => (committed && analysis ? { width: committed.width, height: committed.height } : null), [committed, analysis])
  const loading = !analysis && !error

  return <section aria-label="Trim or crop image" className="space-y-3 rounded-xl border border-[var(--border)] p-3 sm:p-4">
    <div className="flex flex-wrap items-center gap-2">
      {analysis?.transparentTrim && <button type="button" className={button} onClick={() => analysis.transparentTrim && select(analysis.transparentTrim, 'Transparent margins trimmed, with about 2% breathing room. Adjust the box if you like, then Apply.')}>Auto-trim transparent edges</button>}
      {analysis?.transparent && !analysis.transparentTrim && <span className="text-xs text-[var(--text-muted)]">This image has no empty transparent margin to trim.</span>}
      {analysis?.backgroundTrim && analysis.background && <button type="button" className={button} onClick={() => analysis.backgroundTrim && select(analysis.backgroundTrim, 'Plain background margin selected. Check that no part of the logo is cut off before you Apply.')}>
        Trim plain background (check the preview)</button>}
      <button type="button" className={button} onClick={reset} disabled={!crop}>Reset</button>
    </div>
    {note && <p role="status" className="text-xs text-[var(--text-secondary)]">{note}</p>}
    {error && <p role="alert" className="rounded-lg border border-red-500/30 p-2 text-sm text-red-500">{error}</p>}
    {loading && <p role="status" className="text-sm text-[var(--text-secondary)]">Opening image…</p>}

    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-semibold text-[var(--text-primary)]">Drag the box or its handles to crop (any shape)</p>
        <div className="max-h-[60vh] overflow-auto rounded-lg p-2" style={checker}>
          {sourceUrl && <ReactCrop
            crop={crop}
            onChange={(_pixels, percent) => setCrop(percent)}
            onComplete={(_pixels, percent) => {
              if (analysis && percent.width > 0 && percent.height > 0) setCommitted(toPixels(percent, analysis.width, analysis.height))
              else setCommitted(null)
            }}
            minWidth={8}
            minHeight={8}
            keepSelection
            ruleOfThirds={false}
            aria-label="Crop area. Use the arrow keys to move it."
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceUrl} alt="Image being edited" className="block max-h-[56vh] max-w-full" />
          </ReactCrop>}
        </div>
        {analysis && <p className="mt-1 text-xs text-[var(--text-muted)]">Original: {analysis.width} × {analysis.height}px</p>}
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-[var(--text-primary)]">Result</p>
        <div className="flex min-h-40 items-center justify-center rounded-lg p-2" style={checker}>
          {previewUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={previewUrl} alt="Preview of the cropped image" className="max-h-[40vh] max-w-full object-contain" />
            : <p className="p-4 text-center text-xs text-[var(--text-secondary)]">{committed ? 'Preparing preview…' : 'Draw a crop box, or use a trim button, to preview the result.'}</p>}
        </div>
        {result && <p className="mt-1 text-xs text-[var(--text-muted)]">Result: {result.width} × {result.height}px. Never enlarged; transparency is kept.</p>}
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={primary} disabled={!committed || applying} onClick={() => void apply()}>{applying ? 'Applying…' : 'Apply'}</button>
      <button type="button" className={button} onClick={onCancel} disabled={applying}>Cancel</button>
      <span className="text-xs text-[var(--text-muted)]">Applying checks the edited file again before it can be uploaded. The original stays untouched.</span>
    </div>
  </section>
}
