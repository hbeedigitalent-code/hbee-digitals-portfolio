'use client'

import { useState } from 'react'

interface BlogReadingToolsProps {
  title?: string
  url?: string
}

export default function BlogReadingTools({ title = '', url = '' }: BlogReadingToolsProps) {
  const [copied, setCopied] = useState(false)

  const fullUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
  const shareTitle = encodeURIComponent(title || document?.title || '')
  const shareUrl = encodeURIComponent(fullUrl)

  const shareLinks = [
    {
      name: 'Copy Link',
      icon: '/svgs/link.svg',
      action: async () => {
        try {
          await navigator.clipboard.writeText(fullUrl)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Fallback
          const input = document.createElement('input')
          input.value = fullUrl
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      },
      href: null,
      label: copied ? 'Copied!' : 'Copy link',
    },
    {
      name: 'X',
      icon: '/svgs/twitter.svg',
      action: null,
      href: `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`,
      label: 'Share on X',
    },
    {
      name: 'Facebook',
      icon: '/svgs/facebook.svg',
      action: null,
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      label: 'Share on Facebook',
    },
    {
      name: 'Instagram',
      icon: '/svgs/instagram.svg',
      action: null,
      href: 'https://www.instagram.com/thehbeedigitals',
      label: 'Follow on Instagram',
    },
    {
      name: 'LinkedIn',
      icon: '/svgs/linkedin.svg',
      action: null,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      label: 'Share on LinkedIn',
    },
  ]

  return (
    <div className="flex items-center gap-2">
      {shareLinks.map((link) => {
        if (link.action) {
          return (
            <button
              key={link.name}
              onClick={link.action}
              aria-label={link.label}
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] transition hover:scale-105 hover:border-[#39D97A] ${
                copied ? 'border-[#39D97A] text-[#39D97A]' : 'text-[var(--text-muted)]'
              }`}
            >
              <img
                src={link.icon}
                alt=""
                className={`h-4 w-4 ${copied ? 'opacity-100' : 'opacity-60'}`}
              />
            </button>
          )
        }

        return (
          <a
            key={link.name}
            href={link.href || ''}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:scale-105 hover:border-[#39D97A]"
          >
            <img src={link.icon} alt="" className="h-4 w-4 opacity-60" />
          </a>
        )
      })}
    </div>
  )
}