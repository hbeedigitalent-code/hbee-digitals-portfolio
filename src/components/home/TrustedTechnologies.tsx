'use client'

import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

const technologies = [
  'Shopify',
  'Meta',
  'Google',
  'Klaviyo',
  'Next.js',
  'Supabase',
  'Vercel',
  'Stripe',
]

export default function TrustedTechnologies() {
  return (
    <section className="relative overflow-hidden border-y border-[#1E314A] bg-[#0B1728] py-8">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[200px] w-[500px] -translate-x-1/2 rounded-full bg-[#39D97A]/5 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
            Trusted Technologies & Platforms
          </p>
        </div>

        <div className="overflow-hidden">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="flex w-max gap-6"
          >
            {[...technologies, ...technologies].map((tech, index) => (
              <div
                key={`${tech}-${index}`}
                className="flex items-center gap-3 rounded-full border border-[#1E314A] bg-[#07111F] px-6 py-3"
              >
                <span className="h-2 w-2 rounded-full bg-[#39D97A]" />

                <span className="text-sm font-bold text-white/75">
                  {tech}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}