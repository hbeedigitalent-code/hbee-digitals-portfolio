'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface CTAData {
  title?: string
  subtitle?: string
  buttonText?: string
  buttonLink?: string
}

interface Props {
  data: CTAData
}

export default function CTASection({ data }: Props) {
  const reducedMotion = useReducedMotion()

  const {
    title,
    subtitle = 'Book a free growth review and let\'s create a plan tailored to your business.',
    buttonText = 'Start Your Growth Plan',
    buttonLink = '/contact',
  } = data || {}

  return (
    <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 sm:px-6 sm:py-20 md:px-10 lg:px-12 lg:py-24">
      {/* Background effects */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#39D97A]/6 blur-[140px]" />
        <div className="absolute -right-24 bottom-0 h-[250px] w-[350px] rounded-full bg-[#C6F135]/4 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true }}
        >
          {/* Sparkle icon */}
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/8">
            <SvgIcon name="rocket" size={26} color="#39D97A" />
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-black leading-[1] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
            {title || (
              <>
                Ready to build your next{' '}
                <span className="text-[#39D97A]">growth system?</span>
              </>
            )}
          </h2>

          {/* Subtitle */}
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/50 sm:text-base">
            {subtitle}
          </p>

          {/* CTA Button */}
          <Link
            href={buttonLink}
            className="group mt-8 inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#39D97A] px-8 py-3.5 text-sm font-black text-[#06101F] shadow-[0_0_30px_rgba(57,217,122,0.2)] transition hover:scale-[1.02] hover:bg-[#C6F135]"
          >
            {buttonText}
            <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
          </Link>

          {/* Trust line */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.12em] text-white/30">
            <span className="inline-flex items-center gap-1.5">
              <SvgIcon name="verified" size={11} color="#39D97A" />
              Free Consultation
            </span>
            <span className="inline-flex items-center gap-1.5">
              <SvgIcon name="messages" size={11} color="#39D97A" />
              24hr Response
            </span>
            <span className="inline-flex items-center gap-1.5">
              <SvgIcon name="security" size={11} color="#39D97A" />
              No Obligation
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}