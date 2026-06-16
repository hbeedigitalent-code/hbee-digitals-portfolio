// src/components/home/BeforeAfterPreview.tsx
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'

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

export default function BeforeAfterPreview({ items = [] }: { items?: BeforeAfterItem[] }) {
  // Find first item that has BOTH before and after images
  const item = items.find((project) => project.before_image && project.after_image)

  if (!item) return null

  return (
    <section className="relative overflow-hidden bg-[var(--bg-section)] px-5 py-16 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--bg-card)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)] shadow-[var(--shadow-sm)]">
              <SvgIcon name="verified" size={14} color="var(--accent)" />
              Before & After
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
              Transforming outdated pages into{' '}
              <span className="text-[var(--accent)]">growth systems.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
              See how better structure, stronger visual hierarchy, trust sections,
              and conversion-focused layouts improve brand perception.
            </p>
          </div>

          <Link
            href="/before-after"
            className="inline-flex min-h-[52px] w-fit items-center justify-center rounded-full border border-[var(--accent)]/20 bg-[var(--bg-card)] px-6 py-3 text-sm font-black text-[var(--accent)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--accent)]/10"
          >
            View Transformations
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2.4rem] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-lg)]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                {getMetric(item)}
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                {getTitle(item)}
              </h3>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                {item.project_type ||
                  item.description ||
                  'A focused transformation built around trust, mobile experience, and conversion clarity.'}
              </p>
            </div>

            <Link
              href={item.slug ? `/portfolio/${item.slug}` : '/portfolio'}
              className="inline-flex min-h-[50px] w-fit items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-white transition hover:bg-[var(--accent-lime)]"
            >
              View Case Study
              <SvgIcon name="arrow-diagonal" size={15} color="white" />
            </Link>
          </div>

          {/* Interactive Before/After Slider */}
          <BeforeAfterSlider
            beforeImage={item.before_image || ''}
            afterImage={item.after_image || ''}
            beforeLabel="BEFORE"
            afterLabel="AFTER"
          />
        </div>
      </div>
    </section>
  )
}