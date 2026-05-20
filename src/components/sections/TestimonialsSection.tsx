'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface Testimonial {
  id: string
  name: string
  company?: string
  role?: string
  content: string
  image_url?: string
  rating?: number
}

function StarRating({
  rating = 5,
  size = 14,
}: {
  rating?: number
  size?: number
}) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(Math.max(1, Math.min(5, rating)))].map((_, index) => (
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

  useEffect(() => {
    if (testimonials.length <= 1) return

    const interval = setInterval(() => {
      setActiveIndex((prev) =>
        prev === testimonials.length - 1 ? 0 : prev + 1
      )
    }, 6500)

    return () => clearInterval(interval)
  }, [testimonials])

  if (!testimonials.length) return null

  const active = testimonials[activeIndex]

  return (
    <section className="relative overflow-hidden bg-[#07111F] py-20 text-white sm:py-24">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[320px] w-[420px] rounded-full bg-[#39D97A]/7 blur-[120px]" />

        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[#C6F135]/6 blur-[120px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.02)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-14 max-w-4xl">
          <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <StarRating size={12} />
            <span>5.0 Client Reviews</span>
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Trusted by brands serious about{' '}
            <span className="bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
              growth.
            </span>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
            Real feedback from businesses we’ve helped through websites,
            Shopify optimization, branding, and digital growth systems.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_40%)]" />

            <div className="relative p-6 sm:p-8 lg:p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active?.id}
                  initial={
                    reducedMotion
                      ? false
                      : { opacity: 0, y: 24 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    reducedMotion
                      ? undefined
                      : { opacity: 0, y: -24 }
                  }
                  transition={{ duration: 0.38 }}
                >
                  <div className="mb-6">
                    <StarRating
                      rating={active?.rating || 5}
                      size={17}
                    />
                  </div>

                  <div className="mb-8">
                    <SvgIcon
                      name="quote"
                      size={40}
                      color="rgba(57,217,122,0.28)"
                    />
                  </div>

                  <blockquote className="max-w-3xl text-xl font-medium leading-9 text-white/85 sm:text-2xl sm:leading-[1.7]">
                    “{active?.content}”
                  </blockquote>

                  <div className="mt-10 flex items-center gap-4">
                    {active?.image_url ? (
                      <img
                        src={active.image_url}
                        alt={active.name}
                        className="h-14 w-14 rounded-[1.3rem] border border-[#39D97A]/18 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-[#39D97A]/18 bg-[#39D97A]/10">
                        <SvgIcon
                          name="user"
                          size={22}
                          color="#39D97A"
                        />
                      </div>
                    )}

                    <div>
                      <p className="text-lg font-black text-white">
                        {active?.name}
                      </p>

                      <p className="mt-1 text-sm text-white/50">
                        {active?.role || 'Business Owner'}

                        {active?.company
                          ? ` • ${active.company}`
                          : ''}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="grid gap-4">
            {testimonials.map((testimonial, index) => {
              const isActive = activeIndex === index

              return (
                <motion.button
                  key={testimonial.id || index}
                  initial={
                    reducedMotion
                      ? false
                      : { opacity: 0, x: 18 }
                  }
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.38,
                    delay: index * 0.05,
                  }}
                  onClick={() => setActiveIndex(index)}
                  className={`group rounded-[1.6rem] border p-5 text-left transition-all duration-300 ${
                    isActive
                      ? 'border-[#39D97A]/24 bg-[#13233A]'
                      : 'border-[#1E314A] bg-[#0E1B2D]/92 hover:border-[#39D97A]/18 hover:bg-[#13233A]'
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <StarRating
                      rating={testimonial.rating || 5}
                      size={13}
                    />

                    {isActive && (
                      <span className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-3 text-sm leading-7 text-white/65 transition duration-300 group-hover:text-white/78">
                    {testimonial.content}
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    {testimonial.image_url ? (
                      <img
                        src={testimonial.image_url}
                        alt={testimonial.name}
                        className="h-11 w-11 rounded-[1rem] border border-[#39D97A]/16 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#39D97A]/16 bg-[#39D97A]/10">
                        <SvgIcon
                          name="user"
                          size={18}
                          color="#39D97A"
                        />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">
                        {testimonial.name}
                      </p>

                      <p className="truncate text-xs text-white/45">
                        {testimonial.company ||
                          testimonial.role ||
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