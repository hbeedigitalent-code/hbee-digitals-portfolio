'use client'

import { useEffect, useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'

export default function BlogReadingTools({
  title,
}: {
  title: string
}) {
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [currentUrl, setCurrentUrl] = useState('')

  useEffect(() => {
    setCurrentUrl(window.location.href)

    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function copyLink() {
    await navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const encodedUrl = encodeURIComponent(currentUrl)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    {
      label: 'WhatsApp',
      icon: 'whatsapp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: 'LinkedIn',
      icon: 'linkedin',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'Twitter',
      icon: 'twitter',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
  ]

  return (
    <>
      <div className="fixed left-0 top-0 z-[9999] h-1 w-full bg-[#07111F]">
        <div
          className="h-full bg-gradient-to-r from-[#39D97A] to-[#C6F135]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="hidden lg:sticky lg:top-32 lg:block">
        <div className="rounded-[1.5rem] border border-[#1E314A] bg-[#0E1B2D]/90 p-3">
          <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
            Share
          </p>

          <div className="space-y-2">
            {links.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${item.label}`}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1E314A] bg-[#07111F] transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
              >
                <SvgIcon name={item.icon} size={17} color="#39D97A" />
              </a>
            ))}

            <button
              type="button"
              onClick={copyLink}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1E314A] bg-[#07111F] transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
              aria-label="Copy article link"
            >
              <SvgIcon name={copied ? 'verified' : 'link'} size={17} color="#39D97A" />
            </button>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#07111F]/92 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:hidden">
        {links.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0E1B2D]"
          >
            <SvgIcon name={item.icon} size={16} color="#39D97A" />
          </a>
        ))}

        <button
          type="button"
          onClick={copyLink}
          className="flex h-10 items-center justify-center rounded-full bg-[#39D97A] px-4 text-xs font-black text-[#06101F]"
        >
          {copied ? 'Copied' : 'Copy Link'}
        </button>
      </div>
    </>
  )
}