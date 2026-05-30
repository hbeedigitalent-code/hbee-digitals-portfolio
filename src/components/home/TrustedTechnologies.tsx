'use client'

import { motion } from 'framer-motion'

const technologies = [
  { name: 'Shopify', logo: '/svgs/shopify.svg' },
  { name: 'Google', logo: '/svgs/google.svg' },
  { name: 'Meta', logo: '/svgs/meta.svg' },
  { name: 'Klaviyo', logo: '/svgs/klaviyo.svg' },
  { name: 'Next.js', logo: '/svgs/nextjs.svg' },
  { name: 'Supabase', logo: '/svgs/supabase.svg' },
  { name: 'Vercel', logo: '/svgs/vercel.svg' },
  { name: 'Stripe', logo: '/svgs/stripe.svg' },
]

export default function TrustedTechnologies() {
  return (
    <section className="relative overflow-hidden border-y border-[#E4EAE6] bg-[#F7FAF8] py-10 text-[#08111F]">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0F7A43]">
            Trusted Technologies & Platforms
          </p>

          <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
            Built around reliable tools your business can trust.
          </h2>
        </div>
      </div>

      <div className="overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="flex w-max gap-5 px-5"
        >
          {[...technologies, ...technologies].map((tech, index) => (
            <div
              key={`${tech.name}-${index}`}
              className="flex min-w-[190px] items-center justify-center gap-4 rounded-2xl border border-[#E4EAE6] bg-white px-6 py-4 shadow-[0_12px_35px_rgba(8,17,31,0.06)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E4EAE6] bg-[#F7FAF8] p-2">
                <img
                  src={tech.logo}
                  alt={`${tech.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>

              <span className="text-sm font-black text-[#08111F]">
                {tech.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}