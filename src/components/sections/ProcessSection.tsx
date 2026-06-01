'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface ProcessStep {
  title: string
  description: string
  icon: string
}

const steps: ProcessStep[] = [
  {
    title: 'Discovery & Audit',
    description:
      'We review your current website, store, brand position, customer journey, and growth gaps.',
    icon: 'search',
  },
  {
    title: 'Strategy & Direction',
    description:
      'We define what needs to change, what should be prioritized, and how the project will support growth.',
    icon: 'consulting',
  },
  {
    title: 'Design & System Build',
    description:
      'We create the visual experience, technical structure, pages, sections, and conversion flow.',
    icon: 'ui-ux',
  },
  {
    title: 'Optimization & Launch',
    description:
      'We test responsiveness, speed, structure, usability, trust signals, and launch readiness.',
    icon: 'rocket',
  },
]

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 text-[var(--accent)]">{children}</span>
      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[var(--accent)]/75"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function ProcessSection() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-[var(--bg-section)] py-16 text-[var(--text-primary)] sm:py-20 lg:py-24">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-24 h-[320px] w-[420px] rounded-full bg-[var(--accent)]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[var(--accent-lime)]/6 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:78px_78px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          {/* Left Column */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-28"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              <SvgIcon name="systems" size={14} color="var(--accent)" />
              Our Process
            </div>

            <h2 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
              How we turn ideas into scalable digital{' '}
              <CurvedUnderlineText>systems.</CurvedUnderlineText>
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              We don't just jump into design. Every project follows a structured path from audit to
              strategy, build, optimization, and launch support.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/contact"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] hover:bg-[var(--accent-lime)]"
              >
                Start Your Project
              </Link>

              <Link
                href="/portfolio"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-7 py-3 text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--bg-card-hover)]"
              >
                View Our Work
              </Link>
            </div>
          </motion.div>

          {/* Right Column - Steps */}
          <div className="relative">
            <div className="absolute left-6 top-6 hidden h-[calc(100%-48px)] w-px bg-gradient-to-b from-[var(--accent)]/0 via-[var(--accent)]/35 to-[var(--accent)]/0 md:block" />

            <div className="space-y-5">
              {steps.map((step, index) => (
                <motion.article
                  key={step.title}
                  initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.07 }}
                  viewport={{ once: true }}
                  className="group relative overflow-hidden rounded-[1.7rem] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-md)] backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:scale-[1.01] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--shadow-lg)] sm:p-6"
                >
                  <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[var(--accent)]/70 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

                  <div className="relative flex flex-col gap-5 sm:flex-row">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 transition group-hover:scale-105">
                      <SvgIcon name={step.icon} size={26} color="var(--accent)" />
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                        Step {String(index + 1).padStart(2, '0')}
                      </div>

                      <h3 className="text-2xl font-black tracking-[-0.035em] text-[var(--text-primary)]">
                        {step.title}
                      </h3>

                      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}