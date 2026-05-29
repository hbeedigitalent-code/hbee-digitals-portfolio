'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface ReviewItem {
  name: string
  role?: string
  company?: string
  quote: string
  rating?: number
  avatar?: string
}

const fallbackReviews: ReviewItem[] = [
  {
    name: 'Austin Zarecky',
    role: 'Store Owner',
    quote:
      'Hbee Digitals helped us improve our store structure and digital setup with clear guidance and practical implementation.',
    rating: 5,
  },
  {
    name: 'Christiana Kwarteng',
    role: 'Brand Owner',
    quote:
      'The support was clear, professional, and focused on improving how our brand appears online.',
    rating: 5,
  },
  {
    name: 'Zafar',
    role: 'Business Owner',
    quote:
      'Reliable, responsive, and strategic. The process helped us understand what needed to be improved and why.',
    rating: 5,
  },
]

export default function ReviewCarousel({
  reviews = fallbackReviews,
}: {
  reviews?: ReviewItem[]
}) {
  const reducedMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  const safeReviews = useMemo(
    () => (reviews?.length ? reviews : fallbackReviews),
    [reviews]
  )

  const activeReview = safeReviews[activeIndex]

  useEffect(() => {
    if (reducedMotion || safeReviews.length <= 1) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeReviews.length)
    }, 6500)

    return () => clearInterval(timer)
  }, [reducedMotion, safeReviews.length])

  function goNext() {
    setActiveIndex((prev) => (prev + 1) % safeReviews.length)
  }

  function goPrev() {
    setActiveIndex((prev) =>
      prev === 0 ? safeReviews.length - 1 : prev - 1
    )
  }

  return (
    <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[420px] rounded-full bg-[#39D97A]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="verified" size={14} color="#39D97A" />
              Client Feedback
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
              Real feedback that builds{' '}
              <GradientHeading>trust.</GradientHeading>
            </h2>
          </div>

          <p className="max-w-2xl text-sm leading-8 text-white/60 sm:text-base lg:justify-self-end">
            Client feedback helps new merchants understand the quality,
            communication, and strategic support behind Hbee Digitals projects.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.42fr_0.58fr]">
          <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Review Summary
            </p>

            <div className="mt-6 rounded-[1.6rem] border border-[#39D97A]/20 bg-[#39D97A]/8 p-5">
              <p className="text-4xl font-black tracking-[-0.05em] text-[#39D97A]">
                ★★★★★
              </p>

              <p className="mt-3 text-sm leading-7 text-white/64">
                Feedback collected from real client conversations, project
                experiences, and service delivery outcomes.
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              {[
                ['Communication', 'Clear and responsive'],
                ['Execution', 'Premium and structured'],
                ['Strategy', 'Growth-focused guidance'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#1E314A] bg-[#07111F] p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-bold text-white/70">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/reviews"
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              View All Reviews
              <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.article
                key={`${activeReview.name}-${activeIndex}`}
                initial={reducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="min-h-[390px] rounded-[1.6rem] border border-[#1E314A] bg-[#07111F] p-6 sm:p-8"
              >
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10">
                      {activeReview.avatar ? (
                        <img
                          src={activeReview.avatar}
                          alt={activeReview.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-black text-[#39D97A]">
                          {activeReview.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-white">
                        {activeReview.name}
                      </h3>

                      <p className="mt-1 text-sm text-white/45">
                        {[activeReview.role, activeReview.company]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>
                  </div>

                  <p className="hidden text-sm font-black text-[#39D97A] sm:block">
                    {'★'.repeat(activeReview.rating || 5)}
                  </p>
                </div>

                <p className="text-3xl font-black leading-none text-[#39D97A]">
                  “
                </p>

                <blockquote className="mt-4 text-xl font-semibold leading-9 tracking-[-0.03em] text-white/82 sm:text-2xl sm:leading-10">
                  {activeReview.quote}
                </blockquote>

                <div className="mt-8 flex flex-wrap gap-2">
                  {['Verified Feedback', 'Project Experience', 'Trust Signal'].map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#39D97A]"
                      >
                        {item}
                      </span>
                    )
                  )}
                </div>
              </motion.article>
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {safeReviews.map((review, index) => (
                  <button
                    key={`${review.name}-${index}`}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show review from ${review.name}`}
                    className={`h-2.5 rounded-full transition ${
                      index === activeIndex
                        ? 'w-8 bg-[#39D97A]'
                        : 'w-2.5 bg-white/20 hover:bg-white/35'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous review"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#07111F] transition hover:border-[#39D97A]/25"
                >
                  <SvgIcon name="chevron-left" size={18} color="#39D97A" />
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next review"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1E314A] bg-[#07111F] transition hover:border-[#39D97A]/25"
                >
                  <SvgIcon name="chevron-right" size={18} color="#39D97A" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}