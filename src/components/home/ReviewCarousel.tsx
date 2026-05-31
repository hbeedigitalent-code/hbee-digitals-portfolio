'use client'

import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

const reviews = [
  {
    name: 'Austin Zarecky',
    role: 'Store Owner',
    quote:
      'Hbee Digitals helped us improve our store structure and digital setup with clear guidance and practical implementation.',
  },
  {
    name: 'Christiana Kwarteng',
    role: 'Brand Owner',
    quote:
      'The support was clear, professional, and focused on improving how our brand appears online.',
  },
  {
    name: 'Zafar',
    role: 'Business Owner',
    quote:
      'Reliable, responsive, and strategic. The process helped us understand what needed to be improved and why.',
  },
]

export default function ReviewCarousel() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] px-5 py-16 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[420px] rounded-full bg-[#C6F135]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em]">
              <SvgIcon name="verified" size={14} color="#1AB85C" />
              Client Feedback
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
              Real feedback that builds{' '}
              <GradientHeading>trust.</GradientHeading>
            </h2>
          </div>

          <p className="max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base lg:justify-self-end">
            Client feedback helps new merchants understand the quality,
            communication, and strategic support behind Hbee Digitals projects.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[0_18px_55px_rgba(10,29,55,0.07)]"
            >
              <p className="text-sm font-black text-[var(--text-accent)]">*****</p>

              <blockquote className="mt-5 text-lg font-semibold leading-8 tracking-[-0.03em] text-[var(--text-secondary)]">
                "{review.quote}"
              </blockquote>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 text-lg font-black text-[#39D97A]">
                  {review.name.charAt(0)}
                </div>

                <div>
                  <h3 className="font-black text-[var(--text-primary)]">{review.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{review.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/reviews"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
          >
            View All Reviews
            <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
          </Link>
        </div>
      </div>
    </section>
  )
}
