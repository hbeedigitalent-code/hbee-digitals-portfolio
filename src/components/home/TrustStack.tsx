'use client'

import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

const trustItems = [
  {
    icon: 'strategy',
    title: 'Clear Strategy',
    description:
      'Every build starts with positioning, conversion flow, and trust signals.',
    accent: 'orange',
  },
  {
    icon: 'performance',
    title: 'Performance Minded',
    description:
      'Interfaces are structured to feel fast, focused, and easy to scan.',
    accent: 'blue',
  },
  {
    icon: 'security',
    title: 'Reliable Systems',
    description:
      'Clean implementation patterns help keep your site stable as it grows.',
    accent: 'orange',
  },
]

// Animation variants for stacked cards
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, x: 30, y: 20 },
  visible: { 
    opacity: 1, 
    x: 0, 
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    }
  },
}

export default function TrustStack() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-[var(--bg-navy)] px-5 py-16 sm:px-6 md:px-10 lg:px-12 lg:py-24">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[var(--blue-500)]/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.03)_1px,transparent_1px)] bg-[size:50px_50px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12 lg:mb-16"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
              Why Choose Hbee Digitals
            </span>
          </div>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl max-w-4xl mx-auto">
            Built around clarity, speed, and{' '}
            <span className="text-[var(--accent)]">credible growth.</span>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-on-dark-muted)] sm:text-base mx-auto">
            Hbee Digitals combines strategy, premium implementation, and
            practical support so every website feels polished and purposeful.
          </p>
        </motion.div>

        {/* Stacked Cards Layout - Offset positioning */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative flex flex-col items-center justify-center max-w-3xl mx-auto"
        >
          {/* Card 1 - Top, centered */}
          <motion.div
            variants={cardVariants}
            custom={0}
            className="relative w-full max-w-2xl z-30"
          >
            <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy-mid)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 transition group-hover:scale-105">
                  <SvgIcon name={trustItems[0].icon} size={24} color="var(--accent)" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-[-0.03em] text-white">
                    {trustItems[0].title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-on-dark-muted)]">
                    {trustItems[0].description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 - Offset to the right */}
          <motion.div
            variants={cardVariants}
            custom={1}
            className="relative w-full max-w-2xl mt-4 z-20 ml-auto lg:ml-12"
          >
            <div className="rounded-2xl border border-[var(--blue-500)]/20 bg-[var(--bg-navy-mid)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--blue-500)]/10 transition group-hover:scale-105">
                  <SvgIcon name={trustItems[1].icon} size={24} color="var(--blue-500)" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-[-0.03em] text-white">
                    {trustItems[1].title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-on-dark-muted)]">
                    {trustItems[1].description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3 - Offset to the left */}
          <motion.div
            variants={cardVariants}
            custom={2}
            className="relative w-full max-w-2xl mt-4 z-10 mr-auto lg:mr-12"
          >
            <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy-mid)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 transition group-hover:scale-105">
                  <SvgIcon name={trustItems[2].icon} size={24} color="var(--accent)" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-[-0.03em] text-white">
                    {trustItems[2].title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--text-on-dark-muted)]">
                    {trustItems[2].description}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Alternative: Responsive grid for mobile (stacked layout only works on desktop) */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:hidden mt-8">
          {trustItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-navy-mid)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/30"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                <SvgIcon 
                  name={item.icon} 
                  size={20} 
                  color={item.accent === 'blue' ? 'var(--blue-500)' : 'var(--accent)'} 
                />
              </div>

              <h3 className="text-lg font-black tracking-[-0.03em] text-white">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[var(--text-on-dark-muted)]">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}