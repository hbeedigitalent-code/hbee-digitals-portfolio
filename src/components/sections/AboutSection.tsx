'use client'

import { useRef } from 'react'
import { useInView } from 'framer-motion'
import { AboutData } from '@/types'
import Image from 'next/image'

interface AboutSectionProps {
  data: AboutData
}

export default function AboutSection({ data }: AboutSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-5%" })

  const { title, subtitle, description, imageUrl, stats, values } = data

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {imageUrl && (
            <div className="relative h-[400px] rounded-lg overflow-hidden">
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <p className="text-gray-700 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 bg-gray-50 rounded-lg"
              style={{
                transform: isInView ? 'none' : 'translateY(20px)',
                opacity: isInView ? 1 : 0,
                transition: `all 0.5s ease ${index * 0.1}s`
              }}
            >
              <div className="text-3xl md:text-4xl font-bold text-[#0A1D37] mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <div
              key={index}
              className="text-center p-6 border border-gray-100 rounded-lg hover:shadow-lg transition"
              style={{
                transform: isInView ? 'none' : 'translateY(20px)',
                opacity: isInView ? 1 : 0,
                transition: `all 0.5s ease ${0.4 + index * 0.1}s`
              }}
            >
              {value.icon && (
                <div className="w-12 h-12 mx-auto mb-4">
                  <img src={value.icon} alt={value.title} className="w-full h-full" />
                </div>
              )}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}