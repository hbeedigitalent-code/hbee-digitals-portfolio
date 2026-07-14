// src/components/growth-readiness/HowItWorks.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Complete Assessment',
    description: 'Answer 7 simple sections about your business. Takes just 5–7 minutes.',
    icon: 'edit'
  },
  {
    number: '02',
    title: 'Receive HGRI™ Score',
    description: 'Get your personalized Growth Readiness Index score across 5 pillars.',
    icon: 'analytics'
  },
  {
    number: '03',
    title: 'Get Growth Profile',
    description: 'Receive a comprehensive growth profile with actionable insights.',
    icon: 'growth-profile'
  },
  {
    number: '04',
    title: 'Opportunity Review',
    description: 'Get considered for additional growth support and partnership.',
    icon: 'opportunity-review'
  }
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section bg-[var(--bg-page)]">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="strategy" size={16} />
            How It Works
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Simple 4-Step Process
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description mx-auto"
          >
            From assessment to opportunity review in 4 simple steps
          </motion.p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center transition-all hover:border-[var(--accent-orange)] hover:shadow-lg hover:shadow-[var(--accent-orange)]/5">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-xl bg-[var(--accent-orange)]/10 p-3">
                    <SvgIcon name={step.icon} size={32} color="var(--accent-orange)" />
                  </div>
                </div>
                <div className="mb-2 text-sm font-bold text-[var(--accent-orange)]">
                  {step.number}
                </div>
                <h3 className="mb-2 font-semibold text-[var(--text-primary)]">{step.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{step.description}</p>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block">
                  <div 
                    className="absolute right-0 top-1/2 h-0.5 w-8 -translate-y-1/2 bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]" 
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}