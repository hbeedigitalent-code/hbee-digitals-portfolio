'use client'

import { useRef, useState, useEffect } from 'react'
import { useInView } from 'framer-motion'
import { AboutData } from '@/types'
import Image from 'next/image'
import Reveal from '@/components/Reveal'

interface AboutSectionProps {
  data: AboutData
}

export default function AboutSection({ data }: AboutSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-5%' })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const { title, subtitle, description, imageUrl, stats, values } = data

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  return (
    <section ref={ref} className="py-20" aria-labelledby="about-heading">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Reveal variant="wipe">
            <h2 id="about-heading" className="text-3xl md:text-4xl font-bold text-white mb-4">
              {title}
            </h2>
          </Reveal>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {imageUrl && (
            <div className="relative h-[400px] rounded-lg overflow-hidden">
              <Image src={imageUrl} alt="Hbee Digitals team at work" fill className="object-cover" />
            </div>
          )}
          <div>
            <p className="text-white/80 leading-relaxed">{description}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 bg-white/5 rounded-lg"
              style={{
                transform: prefersReducedMotion
                  ? 'none'
                  : isInView
                  ? 'none'
                  : 'translateY(20px)',
                opacity: prefersReducedMotion ? 1 : isInView ? 1 : 0,
                transition: prefersReducedMotion
                  ? 'none'
                  : `all 0.5s ease ${index * 0.1}s`,
              }}
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.number}</dd>
              <dd className="text-white/60 text-sm">{stat.label}</dd>
            </div>
          ))}
        </dl>

        <ul className="grid md:grid-cols-2 lg:grid-cols-4 gap-6" aria-label="Our core values">
          {values.map((value, index) => (
            <li
              key={index}
              className="text-center p-6 border border-white/10 rounded-lg hover:shadow-lg transition list-none"
              style={{
                transform: prefersReducedMotion
                  ? 'none'
                  : isInView
                  ? 'none'
                  : 'translateY(20px)',
                opacity: prefersReducedMotion ? 1 : isInView ? 1 : 0,
                transition: prefersReducedMotion
                  ? 'none'
                  : `all 0.5s ease ${0.4 + index * 0.1}s`,
              }}
            >
              {value.icon && (
                <div className="w-12 h-12 mx-auto mb-4">
                  <img src={value.icon} alt="" className="w-full h-full brightness-0 invert" aria-hidden="true" />
                </div>
              )}
              <h3 className="text-xl font-semibold text-white mb-2">{value.title}</h3>
              <p className="text-white/70">{value.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}