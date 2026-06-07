'use client'

import { useState, useEffect } from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

interface BlogTableOfContentsProps {
  content: string
}

export default function BlogTableOfContents({ content }: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState('')
  const [items, setItems] = useState<TocItem[]>([])

  useEffect(() => {
    // Extract headings from content HTML
    const extracted: TocItem[] = []
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const headings = tempDiv.querySelectorAll('h2, h3')

    headings.forEach((heading, index) => {
      const text = heading.textContent?.trim() || ''
      if (!text) return

      const id = heading.id || `heading-${index}`
      heading.id = id // Ensure the heading has an ID

      extracted.push({
        id,
        text,
        level: heading.tagName === 'H2' ? 2 : 3,
      })
    })

    setItems(extracted)
  }, [content])

  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll('h2[id], h3[id]')
      let current = ''

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect()
        if (rect.top <= 120) {
          current = heading.id
        }
      })

      if (current) setActiveId(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [items])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  if (items.length === 0) return null

  return (
    <nav className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[var(--text-primary)]">
        <img src="/svgs/blog.svg" alt="" className="h-4 w-4 opacity-60" />
        Contents
      </h3>

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => scrollToHeading(item.id)}
              className={`w-full text-left transition-colors ${
                item.level === 3 ? 'pl-4 text-xs' : 'text-sm'
              } ${
                activeId === item.id
                  ? 'font-bold text-[#39D97A]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.level === 2 && (
                <span className="mr-1.5 inline-block text-[10px] text-[var(--text-muted)]">
                  {items.filter((i) => i.level === 2).indexOf(item) + 1}.
                </span>
              )}
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}