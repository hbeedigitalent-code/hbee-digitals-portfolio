import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

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
  result?: string
  url?: string
  project_url?: string
}

function getTitle(item: PortfolioItem) {
  return item.title || item.name || 'Portfolio Project'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
}

function getHref(item: PortfolioItem) {
  if (item.slug) return `/portfolio/${item.slug}`
  return item.url || item.project_url || '/portfolio'
}

export default function FeaturedPortfolioSection({
  items = [],
}: {
  items?: PortfolioItem[]
}) {
  if (!items.length) return null

  const featured = items[0]
  const rest = items.slice(1, 5)

  return (
    <section className="relative px-5 py-14 text-white sm:px-6 md:px-10 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="portfolio" size={14} color="#39D97A" />
              Featured Case Studies
            </p>

            <h2 className="max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.06em] sm:text-5xl md:text-6xl">
              Selected systems built for <GradientHeading>growth.</GradientHeading>
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

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Link
            href={getHref(featured)}
            className="group relative min-h-[420px] overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3 transition hover:-translate-y-1 hover:border-[#39D97A]/25"
          >
            <div className="relative h-full min-h-[400px] overflow-hidden rounded-[1.6rem] bg-[#07111F]">
              {getImage(featured) ? (
                <img
                  src={getImage(featured)}
                  alt={getTitle(featured)}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <SvgIcon name="portfolio" size={70} color="#39D97A" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/95 via-[#07111F]/25 to-transparent" />

              <div className="absolute left-5 top-5 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A] backdrop-blur-xl">
                Featured
              </div>

              <div className="absolute bottom-5 left-5 right-5">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  {featured.category || featured.tag || 'Case Study'}
                </p>

                <h3 className="max-w-2xl text-3xl font-black leading-[1] tracking-[-0.045em] text-white sm:text-4xl">
                  {getTitle(featured)}
                </h3>

                {featured.description && (
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                    {featured.description}
                  </p>
                )}

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                  View Case Study
                  <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
                </div>
              </div>
            </div>
          </Link>

          <div className="grid gap-5">
            {rest.map((item) => (
              <Link
                key={item.id || getTitle(item)}
                href={getHref(item)}
                className="group grid gap-4 overflow-hidden rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-3 transition hover:-translate-y-1 hover:border-[#39D97A]/25 sm:grid-cols-[180px_1fr]"
              >
                <div className="relative h-48 overflow-hidden rounded-[1.3rem] bg-[#07111F] sm:h-full">
                  {getImage(item) ? (
                    <img
                      src={getImage(item)}
                      alt={getTitle(item)}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <SvgIcon name="portfolio" size={44} color="#39D97A" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/65 to-transparent" />
                </div>

                <div className="p-2 sm:p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                    {item.category || item.tag || 'Project'}
                  </p>

                  <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-white">
                    {getTitle(item)}
                  </h3>

                  {item.description && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/55">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#39D97A]">
                    View Work
                    <SvgIcon name="arrow-diagonal" size={14} color="#39D97A" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}