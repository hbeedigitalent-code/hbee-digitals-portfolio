'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import styles from './site-footer.module.css'

/** Observe the signature itself, independently of the page-level motion gate. */
export function FooterWordmark() {
  const ref = useRef<HTMLParagraphElement>(null)
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'revealed' | 'static'>('idle')

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches || typeof IntersectionObserver === 'undefined') {
      setPhase('static')
      return
    }

    let finished = false
    setPhase('waiting')
    const observer = new IntersectionObserver(entries => {
      if (!finished && entries.some(entry => entry.isIntersecting)) {
        finished = true
        setPhase('revealed')
        observer.disconnect()
      }
    }, { threshold: 0.15 })
    observer.observe(node)

    const onPreference = () => {
      if (preference.matches) {
        finished = true
        setPhase('static')
        observer.disconnect()
      }
    }
    preference.addEventListener('change', onPreference)
    return () => {
      finished = true
      observer.disconnect()
      preference.removeEventListener('change', onPreference)
    }
  }, [])

  return <p ref={ref} className={styles.wordmark} data-wordmark={phase}>
    <span aria-hidden="true">{Array.from('The Hbee Digitals').map((character, index) => <span key={index} className={styles.character} style={{ '--wordmark-index': index } as CSSProperties}>{character}</span>)}</span>
  </p>
}
