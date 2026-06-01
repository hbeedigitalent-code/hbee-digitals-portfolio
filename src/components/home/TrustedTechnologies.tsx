'use client'

import { motion, useReducedMotion } from 'framer-motion'

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
  const reducedMotion = useReducedMotion()
  const loopItems = [...technologies, ...technologies]

  return (
    <section className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--bg-section)] py-10 text-[var(--text-primary)] sm:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[220px] w-[520px] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 text-center sm:px-6 md:px-10 lg:px-12">
        <p className="eyebrow text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
          Trusted Technologies & Platforms
        </p>

        <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-black leading-tight tracking-[-0.04em] text-[var(--text-primary)] sm:text-3xl md:text-4xl">
          Built around reliable tools your business can trust.
        </h2>
      </div>

      <div className="relative z-10 mt-8 overflow-hidden">
        <motion.div
          animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
          transition={
            reducedMotion
              ? undefined
              : {
                  duration: 28,
                  repeat: Infinity,
                  ease: 'linear',
                }
          }
          className="flex w-max gap-4 px-5 sm:gap-5"
        >
          {loopItems.map((tech, index) => (
            <div
              key={`${tech.name}-${index}`}
              className="flex min-w-[155px] items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[var(--shadow-sm)] sm:min-w-[190px] sm:px-6 sm:py-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-2 sm:h-11 sm:w-11">
                <img
                  src={tech.logo}
                  alt={`${tech.name} logo`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>

              <span className="whitespace-nowrap text-sm font-black text-[var(--text-primary)]">
                {tech.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}