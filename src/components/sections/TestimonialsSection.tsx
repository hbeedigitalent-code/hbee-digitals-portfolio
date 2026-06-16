'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface Testimonial {
  id: string
  name: string
  company?: string
  role?: string
  position?: string
  content: string
  image_url?: string
  avatar_url?: string
  rating?: number
}

const blockedNames = [
  'john doe',
  'jane smith',
  'mike johnson',
  'test user',
  'demo user',
  'sample user',
  'lorem ipsum',
]

function isRealTestimonial(item: Testimonial) {
  const name = item.name?.trim().toLowerCase()
  const content = item.content?.trim()

  if (!name || !content) return false
  if (blockedNames.includes(name)) return false
  if (content.length < 35) return false

  return true
}

// Star Rating Component - Orange stars
function StarRating({
  rating = 5,
  size = 14,
  showEmpty = false,
}: {
  rating?: number
  size?: number
  showEmpty?: boolean
}) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0))
  const fullStars = Math.floor(safeRating)
  const hasHalfStar = safeRating % 1 >= 0.5

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, index) => {
        if (index < fullStars) {
          // Full star
          return (
            <svg
              key={index}
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="var(--accent)"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )
        } else if (index === fullStars && hasHalfStar) {
          // Half star
          return (
            <svg
              key={index}
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="var(--accent)"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <defs>
                <linearGradient id={`half-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="50%" stopColor="var(--accent)" />
                  <stop offset="50%" stopColor="var(--border)" />
                </linearGradient>
              </defs>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={`url(#half-${index})`} />
            </svg>
          )
        } else if (showEmpty) {
          // Empty star
          return (
            <svg
              key={index}
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--border)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )
        }
        return null
      })}
    </div>
  )
}

export default function TestimonialsSection() {
  const reducedMotion = useReducedMotion()

  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    async function fetchTestimonials() {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      setTestimonials(data || [])
    }

    fetchTestimonials()
  }, [])

  const verifiedTestimonials = useMemo(() => {
    return testimonials.filter(isRealTestimonial)
  }, [testimonials])

  useEffect(() => {
    setActiveIndex(0)
  }, [verifiedTestimonials.length])

  useEffect(() => {
    if (verifiedTestimonials.length <= 1) return

    const interval = window.setInterval(() => {
      setActiveIndex((prev) =>
        prev === verifiedTestimonials.length - 1 ? 0 : prev + 1
      )
    }, 6500)

    return () => window.clearInterval(interval)
  }, [verifiedTestimonials.length])

  if (!verifiedTestimonials.length) return null

  const active = verifiedTestimonials[activeIndex]

  return (
    <section className="relative overflow-hidden bg-[var(--bg-section)] py-16 sm:py-20 lg:py-24">
      {/* Background decorative elements using CSS variables */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[var(--accent)]/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-25" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-12 max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full bg-[var(--accent)]/10 px-4 py-2">
            <StarRating rating={5} size={12} />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              Verified Client Feedback
            </span>
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
            Trusted by brands serious about{' '}
            <span className="text-[var(--accent)]">growth.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            Real feedback from businesses we've helped through websites, Shopify
            optimization, branding, and digital growth systems.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Main Testimonial Card - Active */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-xl)] transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent" />

            <div className="relative p-6 sm:p-8 lg:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active?.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -24 }}
                  transition={{ duration: 0.38 }}
                >
                  <div className="mb-6">
                    <StarRating rating={active?.rating || 5} size={20} showEmpty />
                  </div>

                  <div className="mb-8">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-30"
                    >
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                    </svg>
                  </div>

                  <blockquote className="max-w-3xl text-xl font-medium leading-9 text-[var(--text-primary)] sm:text-2xl sm:leading-[1.7]">
                    “{active?.content}”
                  </blockquote>

                  <div className="mt-10 flex items-center gap-4">
                    {active?.image_url || active?.avatar_url ? (
                      <img
                        src={active.image_url || active.avatar_url}
                        alt={active.name}
                        className="h-14 w-14 rounded-xl border border-[var(--accent)]/20 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                        <span className="text-lg font-black text-[var(--accent)]">
                          {active?.name?.charAt(0) || 'H'}
                        </span>
                      </div>
                    )}

                    <div>
                      <p className="text-lg font-black text-[var(--text-primary)]">
                        {active?.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {active?.role || active?.position || 'Client'}
                        {active?.company ? ` • ${active.company}` : ''}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Sidebar - Other Testimonials Grid */}
          <div className="grid gap-4">
            {verifiedTestimonials.map((testimonial, index) => {
              const isActive = activeIndex === index

              return (
                <motion.button
                  key={testimonial.id || index}
                  initial={reducedMotion ? false : { opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.38, delay: index * 0.05 }}
                  onClick={() => setActiveIndex(index)}
                  className={`group rounded-xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 ${
                    isActive
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-[var(--shadow-md)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-md)]'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <StarRating rating={testimonial.rating || 5} size={14} showEmpty />

                    {isActive && (
                      <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                        Reading
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-3 text-sm leading-7 text-[var(--text-secondary)] transition duration-300 group-hover:text-[var(--text-primary)]">
                    {testimonial.content}
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    {testimonial.image_url || testimonial.avatar_url ? (
                      <img
                        src={testimonial.image_url || testimonial.avatar_url}
                        alt={testimonial.name}
                        className="h-11 w-11 rounded-lg border border-[var(--accent)]/20 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                        <span className="text-sm font-black text-[var(--accent)]">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {testimonial.name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {testimonial.company ||
                          testimonial.role ||
                          testimonial.position ||
                          'Client'}
                      </p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Navigation Dots for Mobile */}
        <div className="flex justify-center gap-2 mt-8 lg:hidden">
          {verifiedTestimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeIndex === index
                  ? 'w-6 bg-[var(--accent)]'
                  : 'w-2 bg-[var(--border)] hover:bg-[var(--accent)]/50'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}