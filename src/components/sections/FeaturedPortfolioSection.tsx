import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface PortfolioItem {
  id?: string
  title?: string
  name?: string
  slug?: string
  category?: string
  tag?: string
  description?: string
  image_url?: string
  featured_image?: string
}

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  if (!items.length) return null

  return (
    <section className="relative px-5 py-14 text-white sm:px-6 md:px-10 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="portfolio" size={14} color="#39D97A" />
              Selected Work
            </p>

            <h2 className="max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.06em] sm:text-5xl md:text-6xl">
              Proof of systems built for{' '}
              <span className="bg-gradient-to-r from-[#39D97A] via-[#6EEB73] to-[#C6F135] bg-clip-text text-transparent">
                growth.
              </span>
            </h2>
          </div>

          <Link
            href="/portfolio"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-6 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
          >
            View All Work
            <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((item) => {
            const title = item.title || item.name || 'Portfolio Project'
            const image = item.featured_image || item.image_url
            const slug = item.slug || '#'

            return (
              <Link
                key={item.id || title}
                href={slug === '#' ? '/portfolio' : `/portfolio/${slug}`}
                className="group overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3 transition hover:-translate-y-1 hover:border-[#39D97A]/25"
              >
                <div className="relative overflow-hidden rounded-[1.5rem] bg-[#07111F]">
                  {image ? (
                    <img
                      src={image}
                      alt={title}
                      className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center">
                      <SvgIcon name="portfolio" size={64} color="#39D97A" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/82 via-transparent to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                      {item.category || item.tag || 'Case Study'}
                    </p>

                    <h3 className="text-xl font-black text-white">
                      {title}
                    </h3>

                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/58">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}