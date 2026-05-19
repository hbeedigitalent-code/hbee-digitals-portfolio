'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface Testimonial {
  id: string
  name: string
  role?: string
  company?: string
  content: string
  avatar_url?: string
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function TestimonialsSection() {
  const reducedMotion = useReducedMotion()

  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const fetchTestimonials = async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (data?.length) {
        setTestimonials(data)
      } else {
        setTestimonials([
          {
            id: '1',
            name: 'Austin Reynolds',
            role: 'Store Owner',
            company: 'SpecGT LLC',
            content:
              'The improvements made to our Shopify setup completely changed how the store feels. Much cleaner structure, faster flow, and better customer confidence.',
          },
          {
            id: '2',
            name: 'Christiana',
            role: 'Fashion Brand Founder',
            company: 'Crisluv',
            content:
              'Very detailed process and communication. We fixed multiple hidden issues affecting trust and conversions.',
          },
          {
            id: '3',
            name: 'Magic Milk Team',
            role: 'E-commerce Brand',
            company: 'Magic Milk Germany',
            content:
              'Professional structure, clear strategy, and practical growth recommendations we could actually implement.',
          },
        ])
      }
    }

    fetchTestimonials()
  }, [])

  useEffect(() => {
    if (testimonials.length <= 1) return

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 6000)

    return () => clearInterval(timer)
  }, [testimonials])

  if (!testimonials.length) return null

  const active = testimonials[activeIndex]

  return (
    <section className="relative overflow-hidden py-16 text-white md:py-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-10 h-[340px] w-[460px] rounded-full bg-[#39D97A]/8 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[#C6F135]/7 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-12 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="precision" size={14} color="#39D97A" />
            Client Feedback
          </div>

          <h2 className="mx-auto max-w-4xl text-4xl font-black leading-[0.95] tracking-[-0.055em] text-white md:text-5xl lg:text-6xl">
            Trusted by brands serious about{' '}
            <CurvedUnderlineText>growth.</CurvedUnderlineText>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/60 md:text-lg">
            Real conversations and experiences from business owners we’ve helped improve digitally.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-4">
            {testimonials.map((testimonial, index) => {
              const activeCard = index === activeIndex

              return (
                <button
                  key={testimonial.id}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative overflow-hidden rounded-[1.6rem] border p-5 text-left transition ${
                    activeCard
                      ? 'border-[#39D97A]/28 bg-[#39D97A]/10 shadow-[0_0_40px_rgba(57,217,122,0.12)]'
                      : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.055]'
                  }`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_42%)]" />

                  <div className="relative flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#071427]">
                      {testimonial.avatar_url ? (
                        <img
                          src={testimonial.avatar_url}
                          alt={testimonial.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-black text-[#39D97A]">
                          {testimonial.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-black tracking-[-0.03em] text-white">
                        {testimonial.name}
                      </h3>

                      <p className="mt-1 text-sm text-white/45">
                        {testimonial.role}
                        {testimonial.company ? ` • ${testimonial.company}` : ''}
                      </p>

                      <div className="mt-4 flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <SvgIcon
                            key={star}
                            name="star"
                            size={14}
                            color="#C6F135"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/88 p-6 shadow-[0_35px_100px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.16),transparent_38%),linear-gradient(135deg,rgba(57,217,122,0.08),rgba(198,241,53,0.025)_42%,rgba(6,14,28,0)_80%)]" />

            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -18 }}
                transition={{ duration: 0.4 }}
                className="relative"
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10">
                    <SvgIcon name="quote" size={24} color="#39D97A" />
                  </div>

                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#39D97A]">
                      Verified Client Experience
                    </p>

                    <div className="mt-1 flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <SvgIcon
                          key={star}
                          name="star"
                          size={13}
                          color="#C6F135"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <blockquote className="max-w-3xl text-2xl font-bold leading-[1.45] tracking-[-0.03em] text-white md:text-3xl">
                  “{active.content}”
                </blockquote>

                <div className="mt-8 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#081A30]">
                    {active.avatar_url ? (
                      <img
                        src={active.avatar_url}
                        alt={active.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black text-[#39D97A]">
                        {active.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-black text-white">{active.name}</h4>
                    <p className="mt-1 text-sm text-white/45">
                      {active.role}
                      {active.company ? ` • ${active.company}` : ''}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition ${
                    index === activeIndex
                      ? 'w-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135]'
                      : 'w-2.5 bg-white/18 hover:bg-white/30'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}