'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { backgroundVideoAllowed } from './video-policy'
import styles from './site-video.module.css'

export interface BackgroundVideoProps {
  src: string
  mimeType: 'video/mp4' | 'video/webm'
  /** Required: shown immediately, and instead of the video on phones, with reduced motion, or with data saver on. */
  poster: string
  className?: string
  /** Allow playback below 768px. Off by default; use only for small, short clips. */
  allowMobile?: boolean
}

const REDUCED = '(prefers-reduced-motion: reduce)'
const NARROW = '(max-width: 767px)'

/**
 * Decorative background (BGC) video. The server and the first paint show only the poster; the <video> element is created
 * on the client when conditions allow, so reduced-motion, phone and data-saver visitors never download it. Muted, looped,
 * inline, no controls, hidden from assistive technology, paused while off-screen. Because it moves for more than five
 * seconds, a pause button is available to keyboard and assistive-technology users (visible only while focused).
 *
 * Fills its positioned parent; put content above it. Not placed on any page yet.
 */
export function BackgroundVideo({ src, mimeType, poster, className, allowMobile = false }: BackgroundVideoProps) {
  const [allowed, setAllowed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(false)
  const video = useRef<HTMLVideoElement | null>(null)
  const visible = useRef(true)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const reduced = window.matchMedia(REDUCED)
    const narrow = window.matchMedia(NARROW)
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
    const sync = () => setAllowed(backgroundVideoAllowed({ reducedMotion: reduced.matches, narrow: narrow.matches, saveData, allowMobile }))
    sync()
    reduced.addEventListener('change', sync)
    narrow.addEventListener('change', sync)
    return () => { reduced.removeEventListener('change', sync); narrow.removeEventListener('change', sync) }
  }, [allowMobile])

  const playing = allowed && !failed

  useEffect(() => {
    const node = video.current
    if (!playing || !node) return
    node.muted = true
    const apply = () => { if (!paused && visible.current) void node.play().catch(() => {}); else node.pause() }
    apply()
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; apply() })
    observer.observe(node)
    return () => observer.disconnect()
  }, [playing, paused])

  return <>
    <div className={cn(styles.background, className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" className={styles.media} />
      {playing && <video ref={video} className={styles.media} muted loop playsInline preload="metadata" poster={poster} tabIndex={-1} disablePictureInPicture onError={() => setFailed(true)}>
        <source src={src} type={mimeType} onError={() => setFailed(true)} />
      </video>}
    </div>
    {playing && <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>Pause background video</button>}
  </>
}
