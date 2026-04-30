'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

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

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  useEffect(() => {
    fetchTestimonials()
  }, [])

  useEffect(() => {
    if (!autoplay || testimonials.length === 0) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [autoplay, testimonials.length])

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    setTestimonials(data || [])
    setLoading(false)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex justify-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  if (loading || testimonials.length === 0) {
    return null
  }

  const handleDotClick = (index: number) => {
    setActiveIndex(index)
    setAutoplay(false)
    setTimeout(() => setAutoplay(true), 10000)
  }

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            What Our Clients Say
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
          <p className="text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from our satisfied clients
          </p>
        </motion.div>

        {/* Testimonial Carousel */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl shadow-xl p-8 md:p-10 text-center"
            >
              {/* Quote icon */}
              <div className="text-6xl mb-4 opacity-20 text-[#007BFF]">"</div>
              
              {/* Avatar */}
              {testimonials[activeIndex]?.image_url && (
                <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
                  <Image
                    src={testimonials[activeIndex].image_url}
                    alt={testimonials[activeIndex].name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Stars */}
              {renderStars(testimonials[activeIndex]?.rating || 5)}
              
              {/* Quote text */}
              <p className="text-gray-700 text-lg italic mb-6 leading-relaxed">
                "{testimonials[activeIndex]?.content}"
              </p>
              
              {/* Author */}
              <h3 className="font-bold text-gray-800 text-lg">
                {testimonials[activeIndex]?.name}
              </h3>
              {(testimonials[activeIndex]?.position || testimonials[activeIndex]?.company) && (
                <p className="text-sm text-gray-500">
                  {testimonials[activeIndex]?.position}
                  {testimonials[activeIndex]?.position && testimonials[activeIndex]?.company && ', '}
                  {testimonials[activeIndex]?.company}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Dots */}
          {testimonials.length > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDotClick(idx)}
                  className={`transition-all duration-300 rounded-full ${
                    idx === activeIndex
                      ? 'w-8 h-2 bg-[#007BFF]'
                      : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Navigation Arrows */}
          {testimonials.length > 1 && (
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={() => {
                  setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
                  setAutoplay(false)
                  setTimeout(() => setAutoplay(true), 10000)
                }}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 hover:scale-110"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setActiveIndex((prev) => (prev + 1) % testimonials.length)
                  setAutoplay(false)
                  setTimeout(() => setAutoplay(true), 10000)
                }}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 hover:scale-110"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}