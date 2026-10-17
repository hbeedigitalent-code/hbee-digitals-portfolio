'use client'

import { useState } from 'react'

/** Decorative optional portrait/logo; attribution remains readable if the image fails. */
export function TestimonialImage({ src }: { src?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  if (!src || failedSource === src) return null
  return <img src={src} alt="" width={48} height={48} loading="lazy" decoding="async"
    onError={() => setFailedSource(src)} className="h-12 w-12 shrink-0 rounded-lg bg-white object-contain" />
}
