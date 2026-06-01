import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface FeaturedResultItem {
  id: string
  title?: string
  client_name?: string
  slug?: string
  category?: string
  project_type?: string
  description?: string
  image_url?: string
  metric_label?: string
  metric_value?: string
  industry?: string
  technology?: string
  is_before_after?: boolean
}

function getTitle(item: FeaturedResultItem) {
  return item.client_name || item.title || 'Featured Project'
}

function getImage(item: FeaturedResultItem) {
  return item.image_url || ''
}

function getMetric(item: FeaturedResultItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }

  return item.metric_value || 'Growth'
}

function getHref(item: FeaturedResultItem) {
  return item.slug ? `/portfolio/${item.slug}` : '/portfolio'
}

export default function FeaturedResults({
  items = [],
}: {
  items: FeaturedResultItem[]
}) {
  if (!items.length) {
    return (
      <section className="relative overflow-hidden bg-[var(--bg-page)] px-5 py-16 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
        <div className="absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-[130px]" />

        <div className="relative z-10 mx-auto max-w-7xl rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-[var(--shadow-md)]">
          <p className="eyebrow mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em]">
            <SvgIcon name="portfolio" size={14} color="var(--accent)" />
            Featured Results
          </p>

          <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
            Proof-focused work will appear here soon.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            Active portfolio projects from admin will populate this section once
            they are added and marked active.
          </p>
        </div>
      </section>
    )
  }

  const featured = items[0]
  const sideItems = items.slice(1, 4)

  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] px-5 py-16 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em]">
              <SvgIcon name="portfolio" size={14} color="var(--accent)" />
              Featured Results
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
              Proof-focused work built for{' '}
              <GradientHeading>growth.</GradientHeading>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
              Selected case studies showing stronger trust, better presentation,
              clearer customer journeys, and conversion-focused improvements.
            </p>
          </div>

          <Link
            href="/portfolio"
            className="inline-flex min-h-[52px] w-fit items-center justify-center gap-2 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-6 py-3 text-sm font-black text-[var(--text-accent)] transition hover:bg-[var(--accent)]/15"
          >
            View All Work
            <SvgIcon name="arrow-diagonal" size={15} color="var(--accent)" />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Link
            href={getHref(featured)}
            className="group overflow-hidden rounded-[2.2rem] border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-md)] transition hover:-translate-y-1 hover:border-[var(--accent)]/25"
          >
            <div className="relative min-h-[420px] overflow-hidden rounded-[1.7rem] bg-[var(--bg-section)]">
              {getImage(featured) ? (
                <img
                  src={getImage(featured)}
                  alt={getTitle(featured)}
                  className="h-full min-h-[420px] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center">
                  <SvgIcon name="portfolio" size={70} color="var(--accent)" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/92 via-[var(--bg-page)]/20 to-transparent" />

              <div className="absolute left-5 top-5 rounded-full bg-[var(--accent)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--btn-primary-text)]">
                {getMetric(featured)}
              </div>

              {featured.is_before_after && (
                <div className="absolute right-5 top-5 rounded-full border border-[var(--border)] bg-[var(--bg-section)]/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-primary)] backdrop-blur-xl">
                  Before / After
                </div>
              )}

              <div className="absolute bottom-5 left-5 right-5">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                  {featured.category || featured.industry || 'Case Study'}
                </p>

                <h3 className="text-4xl font-black tracking-[-0.05em] text-[var(--text-inverse)]">
                  {getTitle(featured)}
                </h3>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                  {featured.project_type ||
                    featured.description ||
                    'Conversion-focused digital growth project.'}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">
                  View Case Study
                  <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
                </div>
              </div>
            </div>
          </Link>

          <div className="grid gap-5">
            {sideItems.map((item) => (
              <Link
                key={item.id}
                href={getHref(item)}
                className="group grid gap-4 rounded-[1.8rem] border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:border-[var(--accent)]/25 sm:grid-cols-[180px_1fr]"
              >
                <div className="relative min-h-[170px] overflow-hidden rounded-[1.35rem] bg-[var(--bg-section)]">
                  {getImage(item) ? (
                    <img
                      src={getImage(item)}
                      alt={getTitle(item)}
                      className="h-full min-h-[170px] w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[170px] items-center justify-center">
                      <SvgIcon name="portfolio" size={42} color="var(--accent)" />
                    </div>
                  )}

                  <div className="absolute left-3 top-3 rounded-full bg-[var(--accent)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--btn-primary-text)]">
                    {getMetric(item)}
                  </div>
                </div>

                <div className="flex flex-col justify-center p-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                    {item.category || item.industry || 'Case Study'}
                  </p>

                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--text-primary)]">
                    {getTitle(item)}
                  </h3>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.project_type ||
                      item.description ||
                      'Growth-focused digital improvement.'}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--accent)]">
                    View Project
                    <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}