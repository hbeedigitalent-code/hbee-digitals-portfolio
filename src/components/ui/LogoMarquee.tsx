'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const brands = [
  { name: 'Shopify',     color: '#7AB55C' },
  { name: 'WooCommerce', color: '#96588A' },
  { name: 'Klaviyo',     color: '#4465E7' },
  { name: 'Meta Ads',    color: '#0866FF' },
  { name: 'Google Ads',  color: '#4285F4' },
  { name: 'TikTok',      color: '#000000' },
  { name: 'Mailchimp',   color: '#FFE01B' },
  { name: 'Stripe',      color: '#635BFF' },
  { name: 'PayPal',      color: '#003087' },
  { name: 'Zapier',      color: '#FF4A00' },
  { name: 'Wix',         color: '#FBAD18' },
]

export default function LogoMarquee() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => setShouldAnimate(entry.isIntersecting),
      { threshold: 0.1 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-16 bg-white overflow-hidden"
      aria-label="Trusted by these brands"
      aria-roledescription="carousel"
    >
      <p className="sr-only">Logos of brands we have worked with</p>

      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2 block">
            Trusted By
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Brands We've Worked With
          </h2>
        </motion.div>
      </div>

      <div className="relative">
        <div className="flex overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
          <div
            role="list"
            className={`flex gap-6 py-4 ${shouldAnimate ? 'marquee-track' : ''}`}
            style={{ willChange: 'transform' }}
            onMouseEnter={(e) => {
              if (shouldAnimate)
                (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'
            }}
            onMouseLeave={(e) => {
              if (shouldAnimate)
                (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running'
            }}
          >
            <style jsx>{`
              @keyframes marquee {
                from { transform: translateX(0); }
                to   { transform: translateX(-50%); }
              }
              .marquee-track {
                animation: marquee 30s linear infinite;
              }
            `}</style>

            {[...brands, ...brands].map((brand, i) => (
              <div
                key={i}
                role="listitem"
                aria-label={`${brand.name} logo`}
                className="flex-shrink-0 flex items-center justify-center px-6 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-default group"
                style={{ minWidth: '130px' }}
              >
                <span
                  className="text-sm font-semibold text-gray-500 group-hover:text-gray-800 transition-colors duration-300"
                >
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}