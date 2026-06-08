'use client'

import { useEffect, useState } from 'react'

function IconMask({ name }: { name: string }) {
  return (
    <span
      className="inline-block h-[18px] w-[18px] bg-current"
      style={{
        WebkitMask: `url(/svgs/${name}.svg) center / contain no-repeat`,
        mask: `url(/svgs/${name}.svg) center / contain no-repeat`,
      }}
    />
  )
}

export default function BlogReadingTools({ title }: { title: string }) {
  const [url, setUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  async function copyLink() {
    if (!url) return

    await navigator.clipboard.writeText(url)
    setCopied(true)

    setTimeout(() => setCopied(false), 2000)
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    {
      name: 'twitter',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: 'facebook',
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
      name: 'instagram',
      label: 'Instagram',
      href: 'https://www.instagram.com/thehbeedigitals',
    },
    {
      name: 'linkedin',
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs font-black text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <IconMask name="link" />
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {links.map((item) => (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs font-black text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          aria-label={`Share on ${item.label}`}
        >
          <IconMask name={item.name} />
          <span className="hidden sm:inline">{item.label}</span>
        </a>
      ))}
    </div>
  )
}