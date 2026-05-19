'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const brands = [
  'Shopify',
  'WooCommerce',
  'Klaviyo',
  'Meta Ads',
  'Google Ads',
  'TikTok',
  'Mailchimp',
  'Stripe',
  'PayPal',
  'Zapier',
  'Wix',
  'Vercel',
]

export default function LogoMarquee() {
  const sectionRef = useRef<HTMLElement>(null)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const reducedMotion = useReducedMotion()

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
      className="relative overflow-hidden bg-[#F6FFF9] py-14 sm:py-16"
      aria-label="Trusted platforms and tools"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.09)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      <div className="absolute left-1/2 top-0 h-48 w-[620px] -translate-x-1/2 rounded-full bg-[#39D97A]/18 blur-[90px]" />

      <div className="relative z-10 mx-auto mb-9 max-w-7xl px-5 text-center sm:px-6 md:px-10 lg:px-12">
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#169B52]"
        >
          Platforms we build around
        </motion.p>

        <motion.h2
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          viewport={{ once: true }}
          className="text-2xl font-black tracking-[-0.04em] text-[#06101F] sm:text-3xl md:text-4xl"
        >
          Trusted tools behind better digital growth
        </motion.h2>
      </div>

      <div className="relative z-10">
        <div className="flex overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_96px,_black_calc(100%-96px),transparent_100%)] md:[mask-image:_linear-gradient(to_right,transparent_0,_black_160px,_black_calc(100%-160px),transparent_100%)]">
          <div
            role="list"
            className={`flex min-w-max gap-4 py-3 ${shouldAnimate && !reducedMotion ? 'marquee-track' : ''}`}
            onMouseEnter={(e) => {
              e.currentTarget.style.animationPlayState = 'paused'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.animationPlayState = 'running'
            }}
          >
            <style jsx>{`
              @keyframes marquee {
                from {
                  transform: translateX(0);
                }
                to {
                  transform: translateX(-50%);
                }
              }

              .marquee-track {
                animation: marquee 32s linear infinite;
              }
            `}</style>

            {[...brands, ...brands].map((brand, index) => (
              <motion.div
                key={`${brand}-${index}`}
                role="listitem"
                whileHover={reducedMotion ? undefined : { y: -4, scale: 1.025 }}
                className="group relative flex h-16 min-w-[155px] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#06101F]/8 bg-white/85 px-6 shadow-[0_14px_45px_rgba(6,16,31,0.06)] backdrop-blur-xl transition duration-300 hover:border-[#39D97A]/35 hover:bg-[#39D97A] hover:shadow-[0_20px_60px_rgba(57,217,122,0.18)]"
              >
                <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[#06101F]/20 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

                <span className="text-sm font-black tracking-[-0.02em] text-[#06101F]/60 transition duration-300 group-hover:text-[#06101F]">
                  {brand}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}