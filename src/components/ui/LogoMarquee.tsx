'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const brands = [
  'Shopify', 'WooCommerce', 'Klaviyo', 'Meta Ads', 'Google Ads',
  'TikTok', 'Mailchimp', 'Stripe', 'PayPal', 'Zapier', 'Wix'
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

      <div className="container mx-auto px-4 mb-10">
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
            className={`flex gap-12 py-4 ${shouldAnimate ? 'marquee-track' : ''}`}
            style={{ willChange: 'transform' }}
            onMouseEnter={(e) => {
              if (shouldAnimate) {
                (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused'
              }
            }}
            onMouseLeave={(e) => {
              if (shouldAnimate) {
                (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running'
              }
            }}
          >
            {/* CSS keyframes for the marquee */}
            <style jsx>{`
              @keyframes marquee {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
              }
              .marquee-track {
                animation: marquee 25s linear infinite;
              }
            `}</style>

            {[...brands, ...brands].map((brand, i) => (
              <div
                key={i}
                role="listitem"
                aria-label={`${brand} logo`}
                className="flex-shrink-0 px-8 py-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-300 cursor-default"
              >
                <span className="text-gray-500 font-semibold text-lg whitespace-nowrap">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}