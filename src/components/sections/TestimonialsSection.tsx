'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

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

function StarRating({
  rating = 5,
  size = 14,
}: {
  rating?: number
  size?: number
}) {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 5))

  return (
    <div className="flex items-center gap-1">
      {[...Array(safeRating)].map((_, index) => (
        <img
          key={index}
          src="/svgs/star.svg"
          alt=""
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            filter:
              'brightness(0) saturate(100%) invert(84%) sepia(54%) saturate(564%) hue-rotate(24deg) brightness(104%) contrast(93%)',
          }}
          className="object-contain"
        />
      ))}
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
    <section className="relative overflow-hidden bg-[var(--bg-page)] py-16 text-[var(--text-primary)] sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[var(--accent-lime)]/6 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.02)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-12 max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
            <StarRating size={12} />
            <span>Verified Client Feedback</span>
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
            Trusted by brands serious about <GradientHeading>growth.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            Real feedback from businesses we've helped through websites, Shopify
            optimization, branding, and digital growth systems.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Main Testimonial Card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_40%)]" />

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
                    <StarRating rating={active?.rating || 5} size={17} />
                  </div>

                  <div className="mb-8">
                    <SvgIcon
                      name="quote"
                      size={40}
                      color="rgba(57,217,122,0.28)"
                    />
                  </div>

                  <blockquote className="max-w-3xl text-xl font-medium leading-9 text-[var(--text-secondary)] sm:text-2xl sm:leading-[1.7]">
                    “{active?.content}”
                  </blockquote>

                  <div className="mt-10 flex items-center gap-4">
                    {active?.image_url || active?.avatar_url ? (
                      <img
                        src={active.image_url || active.avatar_url}
                        alt={active.name}
                        className="h-14 w-14 rounded-[1.3rem] border border-[var(--accent)]/18 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-[var(--accent)]/18 bg-[var(--accent)]/10">
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
          </div>

          {/* Sidebar - Other Testimonials */}
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
                  className={`group rounded-[1.6rem] border p-5 text-left transition-all duration-300 ${
                    isActive
                      ? 'border-[var(--accent)]/24 bg-[var(--bg-card-hover)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)]/92 hover:border-[var(--accent)]/18 hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <StarRating rating={testimonial.rating || 5} size={13} />

                    {isActive && (
                      <span className="rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                        Active
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
                        className="h-11 w-11 rounded-[1rem] border border-[var(--accent)]/16 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[var(--accent)]/16 bg-[var(--accent)]/10">
                        <span className="text-sm font-black text-[var(--accent)]">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--text-primary)]">
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
      </div>
    </section>
  )
}