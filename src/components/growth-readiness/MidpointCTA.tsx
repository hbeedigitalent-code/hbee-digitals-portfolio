// src/components/growth-readiness/MidpointCTA.tsx
//
// The midpoint assessment CTA, placed after WhatYouReceive — the point where a
// reader has just been told what approved merchants get and what the free/paid
// split is, and either wants to apply or wants to keep reading.
//
// It does NOT replace the Hero or FinalCTA calls to action; both are unchanged.
// Deliberately quieter than either of them: a bordered panel rather than a full
// tinted section, so the page still reads as one argument rather than three
// pitches.
//
// Copy follows the confirmed programme terms exactly — applying is an
// application for review, the Growth Profile is free for life once approved,
// implementation is paid with 25% coverage, and the September condition is
// stated rather than implied. No turnaround time is claimed, because none has
// been committed to.

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export function MidpointCTA() {
  return (
    <section className="bg-[var(--bg-page)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 sm:p-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                Ready to apply?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                The assessment is how you apply. We review every submission
                ourselves and come back to you with a decision — approval is not
                automatic. Approved merchants keep their Growth Profile free for
                life, whether or not they ever take on a paid project.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                Implementation is paid. Qualified merchants receive 25% coverage
                of Hbee Digitals&apos; implementation fees. Scope must be agreed
                and the required initial payment made during September; delivery
                can continue into October.
              </p>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-3">
              <Link
                href="/assessment"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-7 py-3.5 text-sm font-bold text-white transition-all hover:scale-[1.03] hover:shadow-lg hover:shadow-[var(--accent-orange)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
              >
                Start Assessment
                <SvgIcon
                  name="arrow-right"
                  size={18}
                  color="white"
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="#who-its-for"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-7 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:border-[var(--accent-orange)]/30 hover:bg-[var(--bg-section)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
              >
                Check if you qualify
                <SvgIcon name="chevron-down" size={16} color="var(--text-primary)" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
