import SvgIcon from '@/components/ui/SvgIcon'

interface Author {
  id: string
  name: string
  role: string
  bio: string
  avatar_url: string
  linkedin_url?: string
  twitter_url?: string
}

export default function BlogAuthorBio({ author }: { author: Author | null }) {
  if (!author) return null

  return (
    <div className="mt-8 flex flex-col gap-5 rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-6 sm:flex-row sm:items-start">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.name}
            className="h-16 w-16 rounded-full object-cover border-2 border-[var(--accent)]/30"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-orange-green text-2xl font-black text-white">
            {author.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Bio Content */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-lg font-black text-[var(--text-primary)]">{author.name}</h4>
            <p className="text-sm text-[var(--accent)]">{author.role}</p>
          </div>
          
          {/* Social Links */}
          <div className="flex gap-2">
            {author.linkedin_url && (
              <a
                href={author.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] transition hover:border-[var(--accent)]/25"
              >
                <SvgIcon name="linkedin" size={14} color="var(--accent)" />
              </a>
            )}
            {author.twitter_url && (
              <a
                href={author.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] transition hover:border-[var(--accent)]/25"
              >
                <SvgIcon name="twitter" size={14} color="var(--accent)" />
              </a>
            )}
          </div>
        </div>
        
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{author.bio}</p>
      </div>
    </div>
  )
}