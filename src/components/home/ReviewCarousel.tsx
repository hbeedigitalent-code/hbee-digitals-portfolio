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

// Star rating component for better accessibility
function StarRating({ rating = 5 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rating} out of 5 stars`}>
      {[...Array(rating)].map((_, i) => (
        <svg
          key={i}
          className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function ReviewCarousel() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] px-5 py-16 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[var(--accent)]/7 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[420px] rounded-full bg-[var(--accent-lime)]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em]">
              <SvgIcon name="verified" size={14} color="var(--accent)" />
              Client Feedback
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
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
              className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            >
              <StarRating rating={5} />

              <blockquote className="mt-5 text-lg font-semibold leading-8 tracking-[-0.03em] text-[var(--text-secondary)]">
                "{review.quote}"
              </blockquote>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-lg font-black text-[var(--accent)]">
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
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
          >
            View All Reviews
            <SvgIcon name="arrow-diagonal" size={15} color="var(--btn-primary-text)" />
          </Link>
        </div>
      </div>
    </section>
  )
}