'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, StarHalf } from 'lucide-react'
import Reveal from '@/components/Reveal'

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface Testimonial {
  id: string
  name: string
  position: string
  company: string
  content: string
  rating: number
  image_url: string
  display_order: number
}

// -------------------------------------------------------
// Helper: render stars with half support
// -------------------------------------------------------
function StarRating({ rating }: { rating: number }) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Star
          key={i}
          className="w-5 h-5 text-yellow-400 fill-yellow-400"
          aria-hidden="true"
        />
      )
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <StarHalf
          key={i}
          className="w-5 h-5 text-yellow-400 fill-yellow-400"
          aria-hidden="true"
        />
      )
    } else {
      stars.push(
        <Star
          key={i}
          className="w-5 h-5 text-gray-600"
          aria-hidden="true"
        />
      )
    }
  }

  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {stars}
    </div>
  )
}

// -------------------------------------------------------
// Main component
// -------------------------------------------------------
export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTestimonials()
  }, [])

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    setTestimonials(data || [])
    setLoading(false)
  }

  if (loading || testimonials.length === 0) return null

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="text-xs tracking-widest uppercase text-[#007BFF] font-semibold mb-3">
            Testimonials
          </div>

          <Reveal variant="wipe">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              What Our Clients Say
            </h2>
          </Reveal>

          <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
          <p className="text-white/70 max-w-2xl mx-auto">
            Don't just take our word for it — hear from our satisfied clients
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.article
              key={testimonial.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:border-white/20 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              {/* Stars */}
              <div className="mb-4">
                <StarRating rating={testimonial.rating} />
              </div>

              {/* Quote */}
              <blockquote className="text-white/80 text-sm leading-relaxed mb-6 flex-1">
                “{testimonial.content}”
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/10">
                {testimonial.image_url ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20">
                    <Image
                      src={testimonial.image_url}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007BFF]/30 to-[#00BFFF]/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-white font-semibold text-sm truncate">
                    {testimonial.name}
                  </div>
                  {(testimonial.position || testimonial.company) && (
                    <div className="text-white/50 text-xs truncate">
                      {testimonial.position}
                      {testimonial.position && testimonial.company && ', '}
                      {testimonial.company}
                    </div>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}