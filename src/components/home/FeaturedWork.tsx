'use client'

import { motion, useReducedMotion } from 'framer-motion'

const partners = [
  { name: 'Shopify', logo: '/svgs/shopify.svg' },
  { name: 'Shopify Partners', logo: '/svgs/shopify-partners.svg' },
  { name: 'Google Analytics', logo: '/svgs/google-analytics.svg' },
  { name: 'Klaviyo', logo: '/svgs/klaviyo.svg' },
  { name: 'Meta', logo: '/svgs/meta.svg' },
  { name: 'Vercel', logo: '/svgs/vercel.svg' },
  { name: 'Next.js', logo: '/svgs/nextjs.svg' },
  { name: 'Supabase', logo: '/svgs/supabase.svg' },
]

function PartnerLogo({ name }: { name: string }) {
  const logoMap: Record<string, { icon: string; text: string }> = {
    Shopify: { icon: 'S', text: 'shopify' },
    'Shopify Partners': { icon: 'S', text: 'shopify partners' },
    'Google Analytics': { icon: 'G', text: 'Google Analytics' },
    Klaviyo: { icon: 'K', text: 'klaviyo' },
    Meta: { icon: 'M', text: 'Meta' },
    Vercel: { icon: '▲', text: 'Vercel' },
    'Next.js': { icon: 'N', text: 'NEXT.js' },
    Supabase: { icon: 'S', text: 'supabase' },
  }

  const partner = logoMap[name] || { icon: name[0], text: name }

  return (
    <div className="group flex h-14 items-center justify-center gap-2.5 px-5 transition-opacity duration-300 hover:opacity-100 opacity-60">
      <span className="text-lg font-black text-white/70 tracking-tight">
        {partner.text}
      </span>
    </div>
  )
}

export default function TrustedPartners() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative border-y border-[#1E314A]/50 bg-[#0A1520]/80 py-5 backdrop-blur-xl">
      {/* Subtle top glow */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#39D97A]/20 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.25em] text-white/35"
        >
          Trusted Technologies &amp; Partners
        </motion.p>
      </div>

      {/* Marquee container */}
      <div className="relative overflow-hidden">
        {/* Left fade */}
        <div className="absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#07111F] to-transparent pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#07111F] to-transparent pointer-events-none" />

        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex"
        >
          <div className="flex animate-marquee items-center gap-8 pr-8">
            {[...partners, ...partners].map((partner, index) => (
              <PartnerLogo key={`${partner.name}-${index}`} name={partner.name} />
            ))}
          </div>
          <div className="flex animate-marquee items-center gap-8 pr-8" aria-hidden="true">
            {[...partners, ...partners].map((partner, index) => (
              <PartnerLogo key={`dup-${partner.name}-${index}`} name={partner.name} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}