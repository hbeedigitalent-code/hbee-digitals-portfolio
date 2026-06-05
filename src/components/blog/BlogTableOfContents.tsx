'use client'

import { useEffect, useState } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

export default function BlogTableOfContents({ content }: { content: string }) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    // Parse HTML content to extract headings
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    const headingElements = doc.querySelectorAll('h2, h3')
    
    const extractedHeadings: Heading[] = []
    headingElements.forEach((el, index) => {
      const text = el.textContent || ''
      const level = parseInt(el.tagName[1])
      const id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      extractedHeadings.push({ id, text, level })
    })
    
    setHeadings(extractedHeadings)

    // Add IDs to actual DOM headings after render
    setTimeout(() => {
      const actualHeadings = document.querySelectorAll('.blog-content h2, .blog-content h3')
      actualHeadings.forEach((heading, index) => {
        if (!heading.id && extractedHeadings[index]) {
          heading.id = extractedHeadings[index].id
        }
      })
    }, 100)
  }, [content])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0.1 }
    )

    const headingElements = document.querySelectorAll('.blog-content h2, .blog-content h3')
    headingElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
      <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
        Table of Contents
      </p>
      <nav>
        <ul className="space-y-2">
          {headings.map((heading) => (
            <li
              key={heading.id}
              style={{ marginLeft: heading.level === 3 ? '1rem' : 0 }}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const element = document.getElementById(heading.id)
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                    window.history.pushState({}, '', `#${heading.id}`)
                  }
                }}
                className={`block text-sm transition ${
                  activeId === heading.id
                    ? 'font-bold text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}