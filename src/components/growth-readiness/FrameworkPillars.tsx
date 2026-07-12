// src/components/growth-readiness/FrameworkPillars.tsx
'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

const pillars = [
  {
    name: 'Visibility',
    points: 20,
    icon: 'pillar-visibility',
    description: 'How easily customers find your brand',
    color: 'var(--accent-orange)'
  },
  {
    name: 'Conversion',
    points: 20,
    icon: 'pillar-conversion',
    description: 'How effectively you convert visitors to customers',
    color: 'var(--accent-lime)'
  },
  {
    name: 'Retention',
    points: 20,
    icon: 'pillar-retention',
    description: 'How well you retain and nurture customers',
    color: 'var(--accent-orange)'
  },
  {
    name: 'Authority',
    points: 20,
    icon: 'pillar-authority',
    description: 'Your brand authority and market position',
    color: 'var(--accent-lime)'
  },
  {
    name: 'Scalability',
    points: 20,
    icon: 'pillar-scalability',
    description: 'Your readiness to scale operations',
    color: 'var(--accent-orange)'
  }
]

export function FrameworkPillars() {
  return (
    <section className="section" style={{ background: 'var(--bg-card-dark)' }}>
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="growth-readiness" size={16} />
            The Hbee Growth Framework™
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading section-heading-dark"
          >
            Five Pillars of Growth Readiness
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description section-description-dark mx-auto"
          >
            Our comprehensive framework evaluates your business across five critical dimensions
          </motion.p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border-dark)] bg-[var(--bg-navy)] p-6 text-center transition-all hover:border-[var(--accent-orange)]"
            >
              <div className="relative z-10">
                <div className="mb-3 flex justify-center">
                  <div className="rounded-xl bg-[var(--accent-orange)]/10 p-3 transition-colors group-hover:bg-[var(--accent-orange)]/20">
                    <SvgIcon name={pillar.icon} size={32} color={pillar.color} />
                  </div>
                </div>
                <h3 className="mb-1 text-lg font-semibold text-white">{pillar.name}</h3>
                <div className="mb-2 text-3xl font-bold" style={{ color: 'var(--accent-orange)' }}>
                  {pillar.points}
                </div>
                <div className="text-xs text-[var(--text-on-dark-muted)]">Max Points</div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{pillar.description}</p>
              </div>
              
              {/* Animated gradient border */}
              <div 
                className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  background: `radial-gradient(circle at center, ${pillar.color}15, transparent 70%)`
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Total Score Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 rounded-2xl border border-[var(--border-dark)] bg-[var(--bg-navy)] p-8 text-center"
        >
          <div className="text-sm text-[var(--text-on-dark-muted)]">Total Possible Score</div>
          <div className="text-5xl font-bold text-white">100</div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent-lime)' }} />
              Scale Ready: 80–100
            </span>
            <span className="hidden sm:inline text-[var(--border-dark)]">|</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent-orange)' }} />
              Growth Ready: 60–79
            </span>
            <span className="hidden sm:inline text-[var(--border-dark)]">|</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: '#FBBF24' }} />
              Growth Potential: 40–59
            </span>
            <span className="hidden sm:inline text-[var(--border-dark)]">|</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: 'var(--text-muted)' }} />
              Foundation: 0–39
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}