'use client'

interface BlogAuthorBioProps {
  author?: string
  date?: string
  readTime?: string
  featuredImage?: string | null
  title?: string
}

export default function BlogAuthorBio({
  author = 'Hbee Digitals',
  date,
  readTime,
  featuredImage,
  title,
}: BlogAuthorBioProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#07111F] text-xs font-black text-[#39D97A">
          {(author || 'H').charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--text-primary)]">{author}</span>
          <div className="flex items-center gap-2 text-xs">
            {date && (
              <span className="flex items-center gap-1">
                <img src="/svgs/calendar.svg" alt="" className="h-3 w-3 opacity-50" />
                {date}
              </span>
            )}
            {readTime && (
              <span className="flex items-center gap-1">
                <img src="/svgs/clock.svg" alt="" className="h-3 w-3 opacity-50" />
                {readTime}
              </span>
            )}
          </div>
        </div>
      </div>

      {featuredImage && title && (
        <meta property="og:image" content={featuredImage} />
      )}
    </div>
  )
}