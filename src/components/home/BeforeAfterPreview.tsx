import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface BeforeAfterItem {
  id: string
  title?: string
  client_name?: string
  slug?: string
  before_image?: string
  after_image?: string
  metric_value?: string
  metric_label?: string
  project_type?: string
  description?: string
}

function getTitle(item: BeforeAfterItem) {
  return item.client_name || item.title || 'Website Transformation'
}

function getMetric(item: BeforeAfterItem) {
  if (item.metric_value && item.metric_label) {
    return `${item.metric_value} ${item.metric_label}`
  }

  return item.metric_value || 'Growth'
}

export default function BeforeAfterPreview({
  items = [],
}: {
  items?: BeforeAfterItem[]
}) {
  const item = items.find((project) => project.before_image && project.after_image)

  if (!item) return null

  return (
    <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="verified" size={14} color="#39D97A" />
              Before & After
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
              Transforming outdated pages into{' '}
              <GradientHeading>growth systems.</GradientHeading>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
              See how better structure, stronger visual hierarchy, trust sections,
              and conversion-focused layouts improve brand perception.
            </p>
          </div>

          <Link
            href="/before-after"
            className="inline-flex min-h-[52px] w-fit items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-6 py-3 text-sm font-black text-[#39D97A]"
          >
            View Transformations
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2.4rem] border border-[#1E314A] bg-[#0E1B2D] p-5">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                {getMetric(item)}
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                {getTitle(item)}
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
                {item.project_type ||
                  item.description ||
                  'A focused transformation built around trust, mobile experience, and conversion clarity.'}
              </p>
            </div>

            <Link
              href={item.slug ? `/portfolio/${item.slug}` : '/portfolio'}
              className="inline-flex min-h-[50px] w-fit items-center justify-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F]"
            >
              View Case Study
              <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <PreviewCard title="Before" image={item.before_image} />

            <div className="hidden h-16 w-16 items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 lg:flex">
              <SvgIcon name="arrow-right" size={26} color="#39D97A" />
            </div>

            <PreviewCard title="After" image={item.after_image} highlight />
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewCard({
  title,
  image,
  highlight = false,
}: {
  title: string
  image?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border p-3 ${
        highlight
          ? 'border-[#39D97A]/25 bg-[#39D97A]/8'
          : 'border-[#1E314A] bg-[#07111F]'
      }`}
    >
      <div className="mb-4 flex items-center justify-between px-2 pt-2">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
          {title}
        </p>

        {highlight && (
          <span className="rounded-full bg-[#39D97A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#06101F]">
            Optimized
          </span>
        )}
      </div>

      {image ? (
        <img
          src={image}
          alt={`${title} website preview`}
          className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-[1.5rem] bg-[#0E1B2D]">
          <SvgIcon name="portfolio" size={54} color="#39D97A" />
        </div>
      )}
    </div>
  )
}