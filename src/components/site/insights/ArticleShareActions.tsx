'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { copyText, isShareableUrl, linkedInShareUrl, shareOrCopy, whatsAppShareUrl, type CopyDeps, type ShareDeps } from '@/lib/site/share-links'
import styles from './insights.module.css'

/**
 * Compact share row for a public Insights article: Copy link · LinkedIn · WhatsApp · Share.
 *
 * Used once, at the top of every article (InsightDetailPage), below the title and meta and before the body. There is no second
 * share section at the bottom: the closing area stays focused on the Growth Review conversion.
 *
 * SSR / HYDRATION. The server render and the first client render are identical: nothing here depends on window, navigator or
 * the clipboard until a visitor presses a button. LinkedIn and WhatsApp are plain anchors (they work as links, open in a new tab and
 * need no script); only Copy and Share run code, and only on click, where the browser APIs are read.
 *
 * SHARED ADDRESS. Always `url` — the article's own absolute Hbee URL — never window.location, so tracking parameters and
 * previews never leak into a share.
 */

type Status = 'idle' | 'copied' | 'failed'

const STATUS_RESET_MS = 2400

const ICON = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false, width: 18, height: 18 } as const

function Icon({ children }: { children: ReactNode }) {
  return <svg {...ICON}>{children}</svg>
}

const LinkIcon = () => (
  <Icon>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </Icon>
)
const CheckIcon = () => (
  <Icon>
    <polyline points="5 12.5 10 17.5 19 7" />
  </Icon>
)
const LinkedInIcon = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="3.5" />
    <line x1="8" y1="10.5" x2="8" y2="16.5" />
    <line x1="8" y1="7.75" x2="8" y2="7.8" />
    <line x1="12" y1="10.5" x2="12" y2="16.5" />
    <path d="M12 13.25a2.5 2.5 0 0 1 5 0v3.25" />
  </Icon>
)
const WhatsAppIcon = () => (
  <Icon>
    <path d="M3 21l1.65-4.95A8.5 8.5 0 1 1 8 19.35L3 21z" />
    <path d="M9.25 9c.4 2.3 2.4 4.5 5.4 5.4l1.1-1.25-1.9-1-.9.75c-.95-.4-1.85-1.3-2.25-2.25l.75-.9-1-1.9z" />
  </Icon>
)
const ShareIcon = () => (
  <Icon>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <line x1="8.2" y1="10.8" x2="15.8" y2="6.2" />
    <line x1="8.2" y1="13.2" x2="15.8" y2="17.8" />
  </Icon>
)

/** Legacy copy for browsers or contexts without the async Clipboard API. Runs only from a click handler. */
function legacyCopy(text: string): boolean {
  const previous = document.activeElement as HTMLElement | null
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.top = '0'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  field.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(field)
  previous?.focus?.() // keyboard users keep their place
  return ok
}

/** The browser capabilities, read at click time only (never during render). */
function browserDeps(): ShareDeps & CopyDeps {
  const nav = typeof navigator !== 'undefined' ? navigator : null
  return {
    clipboard: nav?.clipboard ?? null,
    legacyCopy: typeof document !== 'undefined' ? legacyCopy : null,
    share: nav && typeof nav.share === 'function' ? (data) => nav.share(data) : null,
    canShare: nav && typeof nav.canShare === 'function' ? (data) => nav.canShare(data) : null,
  }
}

export function ArticleShareActions({ title, url }: { title: string; url: string }) {
  const labelId = useId()
  const [status, setStatus] = useState<Status>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const flash = useCallback((next: Status) => {
    setStatus(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), STATUS_RESET_MS)
  }, [])

  const onCopy = useCallback(async () => {
    flash((await copyText(url, browserDeps())) ? 'copied' : 'failed')
  }, [flash, url])

  const onShare = useCallback(async () => {
    const outcome = await shareOrCopy(title, url, browserDeps())
    if (outcome === 'copied') flash('copied')
    else if (outcome === 'failed') flash('failed')
    // shared / cancelled: the native sheet handled it; nothing to announce
  }, [flash, title, url])

  // Never build a link from an address that is not an absolute https URL.
  if (!isShareableUrl(url) || !title.trim()) return null

  const copied = status === 'copied'

  return (
    <div className={styles.share} data-insight-share="">
      <p id={labelId} className={styles.shareLabel}>
        Share this insight
      </p>
      <ul className={styles.shareList} aria-labelledby={labelId}>
        <li>
          <button type="button" className={styles.shareBtn} data-state={copied ? 'copied' : undefined} onClick={onCopy} aria-label={copied ? 'Link copied' : 'Copy link'} title="Copy link">
            {copied ? <CheckIcon /> : <LinkIcon />}
          </button>
        </li>
        <li>
          <a className={styles.shareBtn} href={linkedInShareUrl(url)} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" title="Share on LinkedIn">
            <LinkedInIcon />
          </a>
        </li>
        <li>
          <a className={styles.shareBtn} href={whatsAppShareUrl(title, url)} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp">
            <WhatsAppIcon />
          </a>
        </li>
        <li>
          <button type="button" className={styles.shareBtn} onClick={onShare} aria-label="Share article" title="Share article">
            <ShareIcon />
          </button>
        </li>
      </ul>
      {/* Always rendered so the live region exists before it speaks; empty while idle. */}
      <p role="status" aria-live="polite" className={styles.shareStatus}>
        {status === 'copied' ? 'Link copied' : status === 'failed' ? 'Couldn’t copy the link' : ''}
      </p>
    </div>
  )
}
