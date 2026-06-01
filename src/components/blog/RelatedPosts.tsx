import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt?: string
  featured_image?: string
  read_time?: string
}

export default function RelatedPosts({
  posts,
}: {
  posts: BlogPost[]
}) {
  if (!posts?.length) return null

  return (
    <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            Continue Reading
          </p>

          <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl">
            More insights for stronger digital growth.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-3 transition hover:-translate-y-1 hover:border-[var(--accent)]/25 hover:shadow-[var(--shadow-md)]"
            >
              <div className="relative overflow-hidden rounded-[1.5rem] bg-[var(--bg-section)]">
                {post.featured_image ? (
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center">
                    <SvgIcon name="blog" size={54} color="var(--accent)" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/80 via-transparent to-transparent" />
              </div>

              <div className="p-3 pt-5">
                {post.read_time && (
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                    {post.read_time}
                  </p>
                )}

                <h3 className="text-xl font-black leading-tight text-[var(--text-primary)]">
                  {post.title}
                </h3>

                <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">
                  {post.excerpt ||
                    'Practical digital growth insight from Hbee Digitals.'}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)] transition group-hover:gap-3">
                  Read Article
                  <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}