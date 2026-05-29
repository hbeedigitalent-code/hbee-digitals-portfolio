'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export default function PremiumHomeHero() {
  return (
    <section className="relative overflow-hidden bg-[#07111F] pt-36 pb-24">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[160px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.02)_1px,transparent_1px)] bg-[size:90px_90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-2"
          >
            <SvgIcon
              name="verified"
              size={14}
              color="#39D97A"
            />

            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Digital Growth Studio
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-5xl font-black leading-[0.9] tracking-[-0.07em] text-white sm:text-6xl lg:text-8xl"
          >
            Systems built for
            <span className="block text-[#39D97A]">
              growth.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.55 }}
            className="mx-auto mt-8 max-w-3xl text-base leading-8 text-white/60 sm:text-lg"
          >
            Premium websites, Shopify optimization,
            conversion systems, and digital infrastructure
            designed to help ambitious brands grow with
            confidence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55 }}
            className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/contact"
              className="inline-flex min-h-[58px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              Get Free Growth Audit
            </Link>

            <Link
              href="/portfolio"
              className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-8 py-3 text-sm font-black text-[#39D97A]"
            >
              View Case Studies
              <SvgIcon
                name="arrow-diagonal"
                size={15}
                color="#39D97A"
              />
            </Link>
          </motion.div>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {[
              'Shopify Experts',
              'Conversion Focused',
              'Premium Websites',
              'Growth Systems',
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#1E314A] bg-[#0E1B2D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}